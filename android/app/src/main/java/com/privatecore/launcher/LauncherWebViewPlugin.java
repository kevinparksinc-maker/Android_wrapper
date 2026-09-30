package com.privatecore.launcher;

import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LauncherWebView")
public class LauncherWebViewPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (!isHttpsUrl(url)) {
            call.reject("Only valid HTTPS URLs can be opened by the launcher.");
            return;
        }

        Intent intent = new Intent(getActivity(), LiveAppActivity.class);
        intent.putExtra(LiveAppActivity.EXTRA_URL, url);
        intent.putExtra(LiveAppActivity.EXTRA_TITLE, call.getString("title", "Live application"));
        intent.putExtra(LiveAppActivity.EXTRA_FORCE_REFRESH, Boolean.TRUE.equals(call.getBoolean("forceRefresh", true)));
        JSObject capabilities = call.getObject("capabilities");
        if (capabilities != null) {
            intent.putExtra(LiveAppActivity.EXTRA_ALLOW_FILE_UPLOADS, capabilities.getBoolean("allow_file_uploads", true));
            intent.putExtra(LiveAppActivity.EXTRA_ALLOW_DOWNLOADS, capabilities.getBoolean("allow_downloads", true));
            intent.putExtra(LiveAppActivity.EXTRA_PERSIST_SESSION, capabilities.getBoolean("persist_session", true));
            intent.putExtra(LiveAppActivity.EXTRA_EXTERNAL_LINKS, capabilities.getString("external_links", "in_app"));
            intent.putExtra(LiveAppActivity.EXTRA_REFRESH_MODE, capabilities.getString("refresh_mode", "always"));
        }
        getActivity().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void close(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void reload(PluginCall call) {
        call.resolve();
    }

    private boolean isHttpsUrl(String value) {
        if (value == null || value.isEmpty()) return false;
        Uri uri = Uri.parse(value);
        return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null;
    }
}
