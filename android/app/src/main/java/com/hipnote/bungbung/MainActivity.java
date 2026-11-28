package com.hipnote.bungbung;
import android.app.Activity;
import android.content.Intent;
import org.json.JSONObject;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
/** Read-only vehicle probes alongside isolated mock UI. No driving-use declaration. */
public class MainActivity extends Activity {
 private static final String PAGE = "https://appassets.androidplatform.net/assets/index.html?android=1";
 private WebView web;
 private VehicleDistanceBridge distanceBridge;
 private VehicleUxBridge uxBridge;
 private final VehiclePacketStore vehiclePackets = new VehiclePacketStore();
 private void acceptVehiclePacket(JSONObject packet){
  String item = vehiclePackets.remember(packet);
  if (item != null) sendVehiclePackets(item);
 }
 private void sendVehiclePackets(String changedItem){
  if (!pageReady || web == null) return;
  String script = vehiclePackets.javascript(changedItem, PAGE);
  if (script != null) web.evaluateJavascript(script, null);
 }
 private boolean pageReady=false;
 private boolean softwareRendering=false;
 private JSONObject pendingSimulation;
 private void acceptSimulation(Intent intent){
  if(!BuildConfig.DEBUG || intent==null || !"com.hipnote.bungbung.SIMULATE".equals(intent.getAction()))return;
  try {
   JSONObject packet=new JSONObject();
   if(intent.hasExtra("scene")){
    int scene=intent.getIntExtra("scene",-1);
    if(scene<1 || scene>10)return;
    packet.put("scene",scene);
   }else if(intent.hasExtra("payload")){
    String raw=intent.getStringExtra("payload");
    if(raw==null || raw.length()>8192)return;
    packet.put("patch",new JSONObject(raw));
   }else return;
   pendingSimulation=packet;
   deliverSimulation();
  }catch(Exception e){android.util.Log.w("BungbungSim","Rejected simulation payload",e);}
 }
 private void deliverSimulation(){
  if(!pageReady || web==null || pendingSimulation==null)return;
  String packet=pendingSimulation.toString();pendingSimulation=null;
  web.evaluateJavascript("window.dispatchEvent(new CustomEvent('bungbung-simulation',{detail:"+packet+"}));",null);
 }
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);acceptSimulation(intent);}

 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  acceptSimulation(getIntent());
  WebViewAssetLoader loader = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web = new WebView(this);
  // Opt-in diagnostic workaround for emulator GPU texture corruption.
  // Persist only in debug builds; production keeps normal rendering.
  if(BuildConfig.DEBUG){
   android.content.SharedPreferences prefs=getSharedPreferences("render-debug",MODE_PRIVATE);
   if(getIntent().hasExtra("software_rendering")){
    prefs.edit().putBoolean("software",getIntent().getBooleanExtra("software_rendering",false)).apply();
   }
   softwareRendering=prefs.getBoolean("software",false);
   if(softwareRendering)web.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE,null);
   android.util.Log.i("BungbungRender","UI r5 · SDK / software="+softwareRendering);
  }
  web.setBackgroundColor(android.graphics.Color.rgb(240,242,250));
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);
  web.getSettings().setAllowContentAccess(false);
  web.setWebViewClient(new WebViewClientCompat(){
   @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon){pageReady=false;}
   @Override public void onPageFinished(WebView view,String url){
    if(view==web && PAGE.equals(url) && PAGE.equals(view.getUrl())){pageReady=true;
     if(BuildConfig.DEBUG){
      if(getIntent().getBooleanExtra("qa_parked_motion",false)){
       web.evaluateJavascript("window.__bungbungDebugParkedMotion=true;window.dispatchEvent(new Event('bungbung-debug-parked-motion'));",null);
      }
      web.evaluateJavascript("document.body.classList.toggle('render-compat',"+softwareRendering+");var badge=document.getElementById('render-build')||document.createElement('span');badge.id='render-build';badge.textContent='UI r5 · "+BuildConfig.BUILD_REVISION+" · SDK · "+(softwareRendering?"호환 렌더링":"기본 렌더링")+"';document.querySelector('.app-demo-bar').appendChild(badge);",null);
     }
     sendVehiclePackets(null);
     deliverSimulation();}
   }
   @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return loader.shouldInterceptRequest(request.getUrl()); }
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !"appassets.androidplatform.net".equals(request.getUrl().getHost()); }
  });
  distanceBridge=new VehicleDistanceBridge(this,this::acceptVehiclePacket);
  // Keep ordinary Android devices supported: android.car is optional.
  if (android.os.Build.VERSION.SDK_INT >= 29 &&
      getPackageManager().hasSystemFeature(android.content.pm.PackageManager.FEATURE_AUTOMOTIVE)) {
   try { uxBridge=new VehicleUxBridge(this,this::acceptVehiclePacket); }
   catch (LinkageError e) { android.util.Log.w("BungbungUx","Optional AAOS library unavailable",e); }
  }
  setContentView(web);
  web.loadUrl(PAGE);
 }
 @Override protected void onStart(){super.onStart();if(uxBridge!=null)uxBridge.start();if(distanceBridge!=null)distanceBridge.start();}
 @Override protected void onStop(){if(uxBridge!=null)uxBridge.stop();if(distanceBridge!=null)distanceBridge.stop();super.onStop();}
 @Override protected void onDestroy(){pageReady=false;if(uxBridge!=null)uxBridge.close();if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
