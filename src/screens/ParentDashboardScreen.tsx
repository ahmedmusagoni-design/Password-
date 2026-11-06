import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  FamilyAlert,
  FamilyChild,
  parentApi,
  UsageSummary,
} from '../services/ParentApi';

interface ChildOverview {
  child: FamilyChild;
  usage: UsageSummary;
}

const today = () => new Date().toISOString().slice(0, 10);

const ParentDashboardScreen: React.FC = () => {
  const [children, setChildren] = useState<ChildOverview[]>([]);
  const [alerts, setAlerts] = useState<FamilyAlert[]>([]);
  const [invite, setInvite] = useState<{ code: string; expiresAt: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const childNames = useMemo(
    () => new Map(children.map(({ child }) => [child.id, child.name])),
    [children],
  );

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const [familyChildren, familyAlerts] = await Promise.all([
        parentApi.getChildren(),
        parentApi.getAlerts(),
      ]);
      const summaries = await Promise.all(familyChildren.map(async (child) => ({
        child,
        usage: await parentApi.getUsage(child.id, today()),
      })));
      setChildren(summaries);
      setAlerts(familyAlerts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load family data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const createInvite = async () => {
    setWorking(true);
    setError(null);
    try {
      setInvite(await parentApi.createInvite());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create an invite.');
    } finally {
      setWorking(false);
    }
  };

  const sendDailyLimitRequest = async (child: FamilyChild) => {
    setWorking(true);
    setError(null);
    try {
      await parentApi.requestDailyLimit(child.id, 120);
      Alert.alert(
        'Request sent',
        `${child.name}'s device will show a 2-hour daily limit suggestion. This app does not enforce device limits.`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send the request.');
    } finally {
      setWorking(false);
    }
  };

  const acknowledge = async (alertId: string) => {
    setWorking(true);
    setError(null);
    try {
      await parentApi.acknowledgeAlert(alertId);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not acknowledge this alert.');
    } finally {
      setWorking(false);
    }
  };

  const pendingAlerts = alerts.filter((alert) => !alert.acknowledgedAt);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#167E78" />
        <Text style={styles.loadingText}>Loading family data</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void loadDashboard(); }}
          tintColor="#167E78"
        />
      }
    >
      <Text style={styles.title}>Family today</Text>
      <Text style={styles.subtitle}>
        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        {' · '}Summaries shared by linked child devices
      </Text>

      <Pressable
        accessibilityRole="button"
        disabled={working}
        onPress={createInvite}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>{working ? 'Working…' : 'Link a child device'}</Text>
      </Pressable>

      {invite && (
        <View accessibilityLiveRegion="polite" style={styles.invite}>
          <Text style={styles.inviteLabel}>One-time invite · expires in 10 minutes</Text>
          <Text selectable style={styles.inviteCode}>{invite.code}</Text>
          <Text style={styles.mutedText}>
            Enter this code on the child device. It can only be used once.
          </Text>
        </View>
      )}

      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Linked devices</Text>
        {children.length === 0 ? (
          <Text style={styles.emptyText}>
            No child devices are linked yet. Create a one-time invite to connect a device.
          </Text>
        ) : children.map(({ child, usage }) => (
          <View key={child.id} style={styles.childRow}>
            <View style={styles.childHeading}>
              <Text style={styles.childName}>{child.name}</Text>
              <Text style={styles.totalTime}>{usage.totalMinutes} min today</Text>
            </View>
            <Text style={styles.syncText}>
              {usage.updatedAt
                ? `Child-reported · ${new Date(usage.updatedAt).toLocaleString()}`
                : child.lastSyncAt
                  ? `Last device sync · ${new Date(child.lastSyncAt).toLocaleString()}`
                : 'No usage summary shared today'}
            </Text>
            {usage.categories.length > 0 && (
              <Text style={styles.categoryText}>
                {usage.categories.map(({ category, minutes }) => `${category} ${minutes}m`).join('   ·   ')}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={working}
              onPress={() => { void sendDailyLimitRequest(child); }}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Suggest a 2-hour daily limit</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alerts</Text>
        {pendingAlerts.length === 0 ? (
          <Text style={styles.emptyText}>No new alerts.</Text>
        ) : pendingAlerts.map((alert) => (
          <View key={alert.id} style={styles.alertRow}>
            <View style={styles.alertCopy}>
              <Text style={styles.alertTitle}>
                {alert.type === 'sos' ? 'SOS alert' : 'Screen-time notice'}
                {childNames.has(alert.childId) ? ` · ${childNames.get(alert.childId)}` : ''}
              </Text>
              <Text style={styles.syncText}>
                {new Date(alert.createdAt).toLocaleString()}
                {alert.location ? ' · SOS location shared' : ''}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={working}
              onPress={() => { void acknowledge(alert.id); }}
              style={styles.textButton}
            >
              <Text style={styles.secondaryButtonText}>Seen</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Text style={styles.footnote}>
        Daily summaries are opt-in data submitted by the child app. Limit requests require the child’s response
        and are not enforced by this app. Push notifications and native screen-time permissions are not configured.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { backgroundColor: '#F5F7F7', flexGrow: 1, padding: 20 },
  centered: { alignItems: 'center', backgroundColor: '#F5F7F7', flex: 1, justifyContent: 'center' },
  loadingText: { color: '#536669', fontSize: 14, marginTop: 10 },
  title: { color: '#253638', fontSize: 26, fontWeight: '700', marginBottom: 5 },
  subtitle: { color: '#536669', fontSize: 14, lineHeight: 20, marginBottom: 22 },
  primaryButton: { alignItems: 'center', backgroundColor: '#167E78', borderRadius: 8, minHeight: 48, justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  invite: { borderBottomColor: '#B9CECC', borderBottomWidth: 1, borderTopColor: '#B9CECC', borderTopWidth: 1, marginTop: 14, paddingVertical: 14 },
  inviteLabel: { color: '#3E5557', fontSize: 13, fontWeight: '600' },
  inviteCode: { color: '#145F5A', fontSize: 30, fontWeight: '700', letterSpacing: 4, marginVertical: 5 },
  mutedText: { color: '#536669', fontSize: 13, lineHeight: 18 },
  error: { color: '#9F2D28', fontSize: 14, lineHeight: 20, marginTop: 14 },
  section: { marginTop: 28 },
  sectionTitle: { borderBottomColor: '#D5DEDE', borderBottomWidth: 1, color: '#253638', fontSize: 18, fontWeight: '700', paddingBottom: 10 },
  emptyText: { color: '#536669', fontSize: 14, lineHeight: 21, paddingVertical: 16 },
  childRow: { borderBottomColor: '#D5DEDE', borderBottomWidth: 1, paddingVertical: 16 },
  childHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  childName: { color: '#253638', fontSize: 17, fontWeight: '700' },
  totalTime: { color: '#176A65', fontSize: 16, fontWeight: '700' },
  syncText: { color: '#536669', fontSize: 13, lineHeight: 19, marginTop: 5 },
  categoryText: { color: '#304648', fontSize: 13, lineHeight: 20, marginTop: 7 },
  secondaryButton: { alignSelf: 'flex-start', borderColor: '#167E78', borderRadius: 6, borderWidth: 1, marginTop: 12, paddingHorizontal: 12, paddingVertical: 9 },
  secondaryButtonText: { color: '#176A65', fontSize: 13, fontWeight: '700' },
  alertRow: { alignItems: 'center', borderBottomColor: '#D5DEDE', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 13 },
  alertCopy: { flex: 1, paddingRight: 10 },
  alertTitle: { color: '#253638', fontSize: 15, fontWeight: '600' },
  textButton: { padding: 8 },
  footnote: { color: '#536669', fontSize: 12, lineHeight: 18, marginTop: 24, paddingBottom: 16 },
});

export default ParentDashboardScreen;
