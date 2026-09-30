package com.privatecore.launcher;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.util.HashMap;
import java.util.Map;

public class LiveAppActivity extends AppCompatActivity {
    public static final String EXTRA_URL = "com.privatecore.launcher.URL";
    public static final String EXTRA_TITLE = "com.privatecore.launcher.TITLE";
    public static final String EXTRA_FORCE_REFRESH = "com.privatecore.launcher.FORCE_REFRESH";
    public static final String EXTRA_ALLOW_FILE_UPLOADS = "com.privatecore.launcher.ALLOW_FILE_UPLOADS";
    public static final String EXTRA_ALLOW_DOWNLOADS = "com.privatecore.launcher.ALLOW_DOWNLOADS";
    public static final String EXTRA_PERSIST_SESSION = "com.privatecore.launcher.PERSIST_SESSION";
    public static final String EXTRA_EXTERNAL_LINKS = "com.privatecore.launcher.EXTERNAL_LINKS";
    public static final String EXTRA_REFRESH_MODE = "com.privatecore.launcher.REFRESH_MODE";

    private static final int EDGE_ACTIVATION_DP = 28;
    private static final int EDGE_DISMISS_DP = 88;

    private WebView webView;
    private SwipeRefreshLayout refreshLayout;
    private String liveUrl;
    private boolean forceRefresh;
    private boolean allowFileUploads;
    private boolean allowDownloads;
    private boolean persistSession;
    private String externalLinks;
    private String refreshMode;
    private ValueCallback<Uri[]> fileChooserCallback;
    private float edgeStartX = -1;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.BLACK);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                        View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        );

        liveUrl = getIntent().getStringExtra(EXTRA_URL);
        forceRefresh = getIntent().getBooleanExtra(EXTRA_FORCE_REFRESH, true);
        allowFileUploads = getIntent().getBooleanExtra(EXTRA_ALLOW_FILE_UPLOADS, true);
        allowDownloads = getIntent().getBooleanExtra(EXTRA_ALLOW_DOWNLOADS, true);
        persistSession = getIntent().getBooleanExtra(EXTRA_PERSIST_SESSION, true);
        externalLinks = getIntent().getStringExtra(EXTRA_EXTERNAL_LINKS);
        refreshMode = getIntent().getStringExtra(EXTRA_REFRESH_MODE);
        if (externalLinks == null) externalLinks = "in_app";
        if (refreshMode == null) refreshMode = "always";
        String title = getIntent().getStringExtra(EXTRA_TITLE);

        if (!isHttpsUrl(liveUrl)) {
            finish();
            return;
        }

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(11, 15, 21));

        refreshLayout = new SwipeRefreshLayout(this);
        refreshLayout.setColorSchemeColors(Color.rgb(167, 255, 131));
        refreshLayout.setProgressBackgroundColorSchemeColor(Color.rgb(21, 27, 38));
        refreshLayout.setOnRefreshListener(this::refreshFromOrigin);

        webView = new WebView(this);
        configureWebView();
        refreshLayout.addView(webView, new SwipeRefreshLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));
        root.addView(refreshLayout, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        TextView hubButton = makeHubButton(title);
        FrameLayout.LayoutParams buttonParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                dp(42),
                Gravity.TOP | Gravity.START
        );
        buttonParams.setMargins(dp(16), dp(18), dp(16), dp(16));
        root.addView(hubButton, buttonParams);
        hubButton.setOnClickListener(view -> finish());

        root.setOnTouchListener(this::handleEdgeSwipe);
        setContentView(root);
        loadLiveUrl();
    }

    private void configureWebView() {
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(persistSession);
        cookieManager.setAcceptThirdPartyCookies(webView, persistSession);

        webView.setBackgroundColor(Color.rgb(11, 15, 21));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(persistSession);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode("manual".equals(refreshMode) || "standard".equals(refreshMode)
                ? WebSettings.LOAD_DEFAULT
                : (forceRefresh ? WebSettings.LOAD_NO_CACHE : WebSettings.LOAD_DEFAULT));
        if (allowFileUploads) {
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                    fileChooserCallback = callback;
                    try {
                        startActivityForResult(params.createIntent(), 42);
                        return true;
                    } catch (ActivityNotFoundException error) {
                        fileChooserCallback = null;
                        callback.onReceiveValue(null);
                        return false;
                    }
                }
            });
        } else {
            webView.setWebChromeClient(new WebChromeClient());
        }
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String requestedUrl = request.getUrl().toString();
                if (isHttpsUrl(requestedUrl)) {
                    if ("system".equals(externalLinks)) {
                        openExternalUri(request.getUrl());
                        return true;
                    }
                    view.loadUrl(requestedUrl, noCacheHeaders());
                    return true;
                }
                openExternalUri(request.getUrl());
                return true;
            }
        });
        if (allowDownloads) {
            webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> openExternalUri(Uri.parse(url)));
        }
    }

    private void loadLiveUrl() {
        if (forceRefresh) {
            webView.clearCache(true);
            webView.clearHistory();
        }
        webView.loadUrl(liveUrl, noCacheHeaders());
    }

    private void refreshFromOrigin() {
        webView.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);
        webView.clearCache(true);
        webView.reload();
        refreshLayout.setRefreshing(false);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 42 && fileChooserCallback != null) {
            Uri[] results = resultCode == RESULT_OK && data != null && data.getData() != null
                    ? new Uri[]{data.getData()} : null;
            fileChooserCallback.onReceiveValue(results);
            fileChooserCallback = null;
        }
    }

    private Map<String, String> noCacheHeaders() {
        Map<String, String> headers = new HashMap<>();
        if (forceRefresh) {
            headers.put("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
            headers.put("Pragma", "no-cache");
            headers.put("Expires", "0");
        }
        return headers;
    }

    private TextView makeHubButton(String title) {
        TextView button = new TextView(this);
        button.setText("‹  Hub" + (title == null || title.isEmpty() ? "" : " · " + title));
        button.setTextColor(Color.WHITE);
        button.setTextSize(13);
        button.setGravity(Gravity.CENTER_VERTICAL);
        button.setSingleLine(true);
        button.setMaxEms(18);
        button.setPadding(dp(14), 0, dp(16), 0);
        button.setElevation(dp(8));

        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.argb(224, 15, 21, 30));
        background.setCornerRadius(dp(21));
        background.setStroke(dp(1), Color.argb(45, 255, 255, 255));
        button.setBackground(background);
        return button;
    }

    private boolean handleEdgeSwipe(View view, MotionEvent event) {
        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                edgeStartX = event.getX() <= dp(EDGE_ACTIVATION_DP) ? event.getX() : -1;
                return false;
            case MotionEvent.ACTION_UP:
                if (edgeStartX >= 0 && event.getX() - edgeStartX >= dp(EDGE_DISMISS_DP)) {
                    finish();
                    return true;
                }
                edgeStartX = -1;
                return false;
            case MotionEvent.ACTION_CANCEL:
                edgeStartX = -1;
                return false;
            default:
                return false;
        }
    }

    @Override
    public void onBackPressed() {
        finish();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
        }
        super.onDestroy();
    }

    private boolean isHttpsUrl(String value) {
        if (value == null || value.isEmpty()) return false;
        Uri uri = Uri.parse(value);
        return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null;
    }

    private void openExternalUri(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // Unsupported schemes are deliberately ignored instead of being loaded in the WebView.
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
