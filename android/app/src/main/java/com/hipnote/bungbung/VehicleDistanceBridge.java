package com.hipnote.bungbung;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONObject;
import ai.pleos.playground.vehicle.Vehicle;
import ai.pleos.playground.vehicle.api.Odometer;
import ai.pleos.playground.vehicle.api.model.capability.AccessType;
import ai.pleos.playground.vehicle.listener.DistanceDrivenListener;
import kotlin.Unit;

/** Read-only SDK probe. Never injects mock values or writes vehicle properties. */
final class VehicleDistanceBridge {
 interface Sink { void accept(JSONObject packet); }
 private final Context context;
 private final Sink sink;
 private final Handler main=new Handler(Looper.getMainLooper());
 private Vehicle vehicle;
 private Odometer odometer;
 private DistanceDrivenListener listener;
 private int generation=0,updates=0,readSequence=0;
 private boolean supported=false,connected=false,reading=false;
 private String access="UNKNOWN";
 private Float distance=null;
 private long receivedAt=0;
 VehicleDistanceBridge(Context context,Sink sink){this.context=context;this.sink=sink;}
 private void emit(String state,String message,String via){
  try{
   JSONObject p=new JSONObject();
   p.put("source","pleos-sdk");p.put("state",state);p.put("message",message);
   p.put("connected",connected);p.put("supported",supported);p.put("access",access);
   p.put("odometerKm",distance==null?JSONObject.NULL:distance);p.put("receivedAt",receivedAt);
   p.put("updates",updates);p.put("via",via);sink.accept(p);
   android.util.Log.i("BungbungVehicle",p.toString());
  }catch(Exception e){android.util.Log.e("BungbungVehicle","Status delivery failed",e);}
 }
 private void fail(String phase,Exception error){distance=null;emit("error",phase+": "+error.getClass().getSimpleName()+" · "+error.getMessage(),"error");}
 void start(){
  stop();final int epoch=++generation;updates=0;receivedAt=0;access="UNKNOWN";
  emit("connecting","차량 서비스 연결 및 누적 거리 지원 조회 중","capability");
  try{
   vehicle=new Vehicle(context);vehicle.initialize();odometer=vehicle.getOdometer();
   check(epoch,0);
  }catch(Exception e){fail("초기화",e);}
 }
 private void check(final int epoch,final int attempt){
  if(epoch!=generation||odometer==null)return;
  try{
   odometer.checkCurrentDistanceDrivenCapabilities(config->{main.post(()->{
    if(epoch!=generation)return;
    connected=true;access=config.getAccessType().name();
    supported=config.getAccessType()==AccessType.READ||config.getAccessType()==AccessType.READ_WRITE;
    if(!supported){emit("unsupported","서비스 응답 확인 · 누적 거리 읽기 미지원","capability");return;}
    emit("waiting","서비스 연결 확인 · 누적 거리 읽기 지원","capability");
    listener=new DistanceDrivenListener(){
     public void onDistanceDrivenUpdated(Float value){main.post(()->{if(epoch==generation)sample(value,"listener");});}
     public void onFailed(Exception e){main.post(()->{if(epoch==generation)fail("변경 구독",e);});}
    };
    try{odometer.registerDistanceDriven(listener);}catch(Exception e){fail("구독 등록",e);}
    read(epoch);
    main.postDelayed(new Runnable(){public void run(){if(epoch!=generation)return;read(epoch);main.postDelayed(this,15000);}},15000);
   });return Unit.INSTANCE;},error->{main.post(()->{
    if(epoch!=generation)return;
    if(attempt<2){emit("connecting","연결 재시도 "+(attempt+1)+"/2","capability");main.postDelayed(()->check(epoch,attempt+1),2000);}
    else fail("지원 조회",error);
   });return Unit.INSTANCE;});
   if(attempt==0)main.postDelayed(()->{if(epoch==generation&&!connected)emit("error","서비스 응답 없음 · SDK/에뮬레이터 버전과 권한 확인","timeout");},12000);
  }catch(Exception e){fail("지원 조회",e);}
 }
 private void read(final int epoch){
  if(reading||epoch!=generation||odometer==null||!supported)return;
  reading=true;final int request=++readSequence,listenerUpdates=updates;
  main.postDelayed(()->{if(epoch==generation&&request==readSequence&&reading){reading=false;++readSequence;distance=null;emit("error","거리 조회 응답 시간 초과","timeout");}},10000);
  try{odometer.getCurrentDistanceDriven(value->{main.post(()->{if(epoch==generation&&request==readSequence){reading=false;if(listenerUpdates==updates)sample(value,"read");}});return Unit.INSTANCE;},error->{main.post(()->{if(epoch==generation&&request==readSequence){reading=false;if(listenerUpdates==updates)fail("거리 조회",error);}});return Unit.INSTANCE;});}
  catch(Exception e){reading=false;fail("거리 조회",e);}
 }
 private void sample(Float value,String via){
  if(value==null||Float.isNaN(value)||Float.isInfinite(value)||value<0){distance=null;emit("unavailable","거리 값 미수신 또는 유효하지 않음",via);return;}
  distance=value;receivedAt=System.currentTimeMillis();if("listener".equals(via))updates++;
  emit("live","누적 거리 수신 완료",via);
 }
 void stop(){
  ++generation;main.removeCallbacksAndMessages(null);
  if(odometer!=null&&listener!=null)try{odometer.unregisterDistanceDriven(listener);}catch(Exception ignored){}
  if(vehicle!=null)try{vehicle.release();}catch(Exception ignored){}
  vehicle=null;odometer=null;listener=null;reading=false;supported=false;connected=false;distance=null;
  emit("stopped","앱 비활성 · 차량 구독 해제","lifecycle");
 }
}
