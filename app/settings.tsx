import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, MilestoneColors } from '../constants/Colors';
import { Config } from '../constants/config';
import { useApp } from '../contexts/AppContext';
import { getSettings, updateSettings } from '../db/queries';
import { scheduleAllNotifications, isWithinActiveWindow } from '../services/notificationService';

export default function SettingsScreen() {
  const { refreshData } = useApp();

  const [windowStart, setWindowStart] = useState(Config.DEFAULT_ACTIVE_WINDOW_START);
  const [windowEnd, setWindowEnd] = useState(Config.DEFAULT_ACTIVE_WINDOW_END);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      setWindowStart(settings.active_window_start);
      setWindowEnd(settings.active_window_end);
      setNotificationsEnabled(!!settings.manual_toggle_state);
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await updateSettings({
        manual_toggle_state: value ? 1 : 0,
        manual_toggle_timestamp: new Date().toISOString(),
      });
      await scheduleAllNotifications();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const handleSaveWindow = async () => {
    // Basic validation
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(windowStart) || !timeRegex.test(windowEnd)) {
      Alert.alert('Hata', 'Geçersiz saat formatı. HH:MM kullanın (ör. 13:00)');
      return;
    }

    try {
      await updateSettings({
        active_window_start: windowStart,
        active_window_end: windowEnd,
      });
      await scheduleAllNotifications();
      await refreshData();
      Alert.alert('Başarılı', 'Aktif pencere güncellendi.');
    } catch (error) {
      console.error('Save window error:', error);
      Alert.alert('Hata', 'Kaydetme sırasında bir hata oluştu.');
    }
  };

  const inWindow = isWithinActiveWindow(windowStart, windowEnd);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Notifications Toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirimler</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Hatırlatmaları Etkinleştir</Text>
            <Text style={styles.settingDesc}>
              Kapatırsanız, bir sonraki aktif pencere başlangıcında otomatik açılır.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: Colors.surfaceBorder, true: Colors.accentMuted }}
            thumbColor={notificationsEnabled ? Colors.accent : Colors.textMuted}
          />
        </View>

        {/* Current Status */}
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: inWindow && notificationsEnabled ? Colors.success : Colors.textMuted },
            ]}
          />
          <Text style={styles.statusText}>
            {inWindow && notificationsEnabled
              ? 'Bildirimler aktif — aktif pencere içinde'
              : inWindow
                ? 'Bildirimler kapalı (manuel)'
                : 'Aktif pencere dışında'
            }
          </Text>
        </View>
      </View>

      {/* Active Window */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aktif Pencere</Text>
        <Text style={styles.sectionDesc}>
          Sadece bu zaman aralığında bildirim gelir. Gece geçişli saatler desteklenir (ör. 13:00 - 02:00).
        </Text>

        <View style={styles.timeRow}>
          <View style={styles.timeInput}>
            <Text style={styles.timeLabel}>Başlangıç</Text>
            <TextInput
              style={styles.input}
              value={windowStart}
              onChangeText={setWindowStart}
              placeholder="13:00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <Ionicons name="arrow-forward" size={20} color={Colors.textMuted} style={{ marginTop: 28 }} />
          <View style={styles.timeInput}>
            <Text style={styles.timeLabel}>Bitiş</Text>
            <TextInput
              style={styles.input}
              value={windowEnd}
              onChangeText={setWindowEnd}
              placeholder="02:00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveWindowButton}
          onPress={handleSaveWindow}
          activeOpacity={0.8}
        >
          <Text style={styles.saveWindowText}>Kaydet</Text>
        </TouchableOpacity>
      </View>

      {/* Milestones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Streak Hedefleri</Text>
        <Text style={styles.sectionDesc}>
          Streak sayacının rengi bu hedeflere ulaştıkça değişir.
        </Text>

        <View style={styles.milestoneList}>
          {Object.entries(MilestoneColors)
            .filter(([key]) => Number(key) > 0)
            .map(([days, color]) => (
              <View key={days} style={styles.milestoneItem}>
                <View style={[styles.milestoneColor, { backgroundColor: color }]} />
                <Text style={styles.milestoneDays}>{days} gün</Text>
                <View style={styles.milestoneLine} />
                <Text style={[styles.milestoneLabel, { color }]}>
                  {Number(days) === 7
                    ? 'Başlangıç'
                    : Number(days) === 30
                      ? 'Kararlı'
                      : Number(days) === 90
                        ? 'Uzman'
                        : Number(days) === 180
                          ? 'Altın'
                          : 'Efsane'}
                </Text>
              </View>
            ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutAppName}>Flexify</Text>
          <Text style={styles.aboutVersion}>v1.0.0</Text>
          <Text style={styles.aboutDesc}>
            Günlük esneme ve mobilite takipçisi.{'\n'}
            Düzenli esne, streak'ini koru! 🧘
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    textAlign: 'center',
  },
  saveWindowButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveWindowText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  milestoneList: {
    gap: 12,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  milestoneColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  milestoneDays: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    width: 60,
  },
  milestoneLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.surfaceBorder,
  },
  milestoneLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  aboutCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 4,
  },
  aboutAppName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.accent,
  },
  aboutVersion: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  aboutDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});
