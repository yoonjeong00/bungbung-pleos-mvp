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
/** Offline UI demo. No vehicle permissions, SDK bridge or driving-use declaration. */
public class MainActivity extends Activity {
 private WebView web;
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
   android.util.Log.i("BungbungRender","UI r3 / software="+softwareRendering);
  }
  web.setBackgroundColor(android.graphics.Color.rgb(240,242,250));
  web.getSettings().setJavaScriptEnabled(true);
  web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);
  web.getSettings().setAllowContentAccess(false);
  web.setWebViewClient(new WebViewClientCompat(){
   @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon){pageReady=false;}
   @Override public void onPageFinished(WebView view,String url){
    if("https://appassets.androidplatform.net/assets/index.html?android=1".equals(url)){pageReady=true;
     if(BuildConfig.DEBUG){
      web.evaluateJavascript("document.body.classList.toggle('render-compat',"+softwareRendering+");var badge=document.createElement('span');badge.id='render-build';badge.textContent='UI r3 · "+(softwareRendering?"호환 렌더링":"기본 렌더링")+"';document.querySelector('.app-demo-bar').appendChild(badge);",null);
     }
     deliverSimulation();}
   }
   @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return loader.shouldInterceptRequest(request.getUrl()); }
   @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return !"appassets.androidplatform.net".equals(request.getUrl().getHost()); }
  });
  setContentView(web);
  web.loadUrl("https://appassets.androidplatform.net/assets/index.html?android=1");
 }
 @Override protected void onDestroy(){if(web!=null)web.destroy();super.onDestroy();}
}
