package expo.modules.aceliveupdate

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class LiveUpdate : Record {
  @Field val title: String = ""
  @Field val text: String = ""
  @Field val chip: String = ""
  @Field val startsAt: Double = 0.0
  @Field val endsAt: Double = 0.0
  @Field val url: String = ""
}

// Equivalente Android da Live Activity (T41): notificação fixa com cronômetro
// que conta até o início e depois o tempo de jogo. No Android 16 ela é
// promovida a "Live Update" (chip na barra de status e topo da tela bloqueada).
class AceLiveUpdateModule : Module() {
  private val channelId = "ace-live-match"
  private val notificationId = 4101

  private val context get() = requireNotNull(appContext.reactContext)
  private val manager get() = context.getSystemService(NotificationManager::class.java)

  override fun definition() = ModuleDefinition {
    Name("AceLiveUpdate")

    Function("show") { update: LiveUpdate ->
      if (!manager.areNotificationsEnabled()) return@Function false
      manager.createNotificationChannel(
        NotificationChannel(channelId, "Partida em andamento", NotificationManager.IMPORTANCE_DEFAULT)
          .apply { setSound(null, null); enableVibration(false) }
      )
      val now = System.currentTimeMillis()
      val startsAt = update.startsAt.toLong()
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(update.url)).setPackage(context.packageName)
      val open = PendingIntent.getActivity(
        context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
      )
      // Ícone monocromático do expo-notifications; sem ele, o ícone do app.
      val icon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
        .takeIf { it != 0 } ?: context.applicationInfo.icon
      val builder = Notification.Builder(context, channelId)
        .setSmallIcon(icon)
        .setContentTitle(update.title)
        .setContentText(update.text)
        .setStyle(Notification.BigTextStyle().bigText(update.text))
        .setContentIntent(open)
        .setCategory(Notification.CATEGORY_EVENT)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setShowWhen(true)
        .setWhen(startsAt)
        .setUsesChronometer(true)
        .setChronometerCountDown(now < startsAt)
        .setTimeoutAfter((update.endsAt.toLong() - now).coerceAtLeast(1_000))
      if (Build.VERSION.SDK_INT >= 36) {
        builder.setShortCriticalText(update.chip)
        // EXTRA_REQUEST_PROMOTED_ONGOING só é público no SDK 36.1; o compileSdk
        // do Expo 57 é 36, então vai a chave literal (a mesma que o sistema lê).
        builder.extras.putBoolean("android.requestPromotedOngoing", true)
      }
      manager.notify(notificationId, builder.build())
      true
    }

    Function("hide") {
      manager.cancel(notificationId)
    }
  }
}
