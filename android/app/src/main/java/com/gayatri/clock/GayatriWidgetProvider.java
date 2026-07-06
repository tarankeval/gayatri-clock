package com.gayatri.clock;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class GayatriWidgetProvider extends AppWidgetProvider {
    private static final String WIDGET_KEY = "gayatri-time-widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, manager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, GayatriWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
    }

    private static void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.gayatri_widget);
        WidgetSnapshot snapshot = readSnapshot(context);

        views.setTextViewText(R.id.widgetTitle, snapshot.title);
        views.setTextViewText(R.id.widgetNext, snapshot.next);
        views.setTextViewText(R.id.widgetLocation, snapshot.location);
        views.setTextViewText(R.id.widgetUpdated, snapshot.updated);

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, launchIntent, flags);
            views.setOnClickPendingIntent(R.id.widgetRoot, pendingIntent);
        }

        manager.updateAppWidget(appWidgetId, views);
    }

    private static WidgetSnapshot readSnapshot(Context context) {
        SharedPreferences preferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = preferences.getString(WIDGET_KEY, null);
        if (raw == null) {
            return new WidgetSnapshot(
                "Gayatri Time",
                "Open the app to calculate today's time",
                "Location not set",
                "Not synced yet"
            );
        }

        try {
            JSONObject json = new JSONObject(raw);
            String title = json.optString("title", "Gayatri Time");
            String nextLabel = json.optString("nextLabel", "Next");
            String nextTime = json.optString("nextTime", "—");
            String location = json.optString("location", "Location not set");
            String updatedAt = json.optString("updatedAt", "—");
            return new WidgetSnapshot(title, nextLabel + " · " + nextTime, location, "Updated " + updatedAt);
        } catch (Exception ignored) {
            return new WidgetSnapshot(
                "Gayatri Time",
                "Open the app to refresh",
                "Location not set",
                "Sync unavailable"
            );
        }
    }

    private static class WidgetSnapshot {
        final String title;
        final String next;
        final String location;
        final String updated;

        WidgetSnapshot(String title, String next, String location, String updated) {
            this.title = title;
            this.next = next;
            this.location = location;
            this.updated = updated;
        }
    }
}
