package com.pablo.cofrinho;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override protected void onCreate(Bundle state) {
    registerPlugin(CofrinhoBridgePlugin.class);
    super.onCreate(state);
  }
}