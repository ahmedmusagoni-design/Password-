import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ControlRequest, parentApi } from '../services/ParentApi';

const ChildRequestsScreen: React.FC = () => {
  const [requests, setRequests] = useState<ControlRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setError(null);
    try {
      setRequests(await parentApi.getPendingControlRequests());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load parent requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  const respond = async (request: ControlRequest, status: 'accepted' | 'declined') => {
    setBusyId(request.id);
    setError(null);
    try {
      await parentApi.respondToControlRequest(request.id, status);
      await loadRequests();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Could not save your response.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void loadRequests(); }}
          tintColor="#167E78"
        />
      }
    >
      <Text style={styles.title}>Parent requests</Text>
      <Text style={styles.intro}>
        You can accept or decline each suggestion. A response is shared with your parent; this app cannot change device limits.
      </Text>
      {loading ? (
        <ActivityIndicator color="#167E78" />
      ) : requests.length === 0 ? (
        <Text style={styles.empty}>No pending requests.</Text>
      ) : requests.map((request) => (
        <View key={request.id} style={styles.requestRow}>
          <Text style={styles.requestTitle}>
            {request.type === 'daily_limit' ? 'Daily screen-time suggestion' : 'Focus session suggestion'}
          </Text>
          <Text style={styles.requestDetail}>{request.minutes} minutes</Text>
          <Text style={styles.requestDetail}>
            Sent {new Date(request.createdAt).toLocaleString()}
          </Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busyId === request.id}
              onPress={() => { void respond(request, 'declined'); }}
              style={styles.declineButton}
            >
              <Text style={styles.declineLabel}>Decline</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busyId === request.id}
              onPress={() => { void respond(request, 'accepted'); }}
              style={styles.acceptButton}
            >
              <Text style={styles.acceptLabel}>Accept</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { backgroundColor: '#F5F7F7', flexGrow: 1, padding: 20 },
  title: { color: '#253638', fontSize: 25, fontWeight: '700' },
  intro: { color: '#536669', fontSize: 14, lineHeight: 21, marginBottom: 20, marginTop: 8 },
  empty: { color: '#536669', fontSize: 14, paddingVertical: 12 },
  requestRow: { borderBottomColor: '#D5DEDE', borderBottomWidth: 1, paddingVertical: 16 },
  requestTitle: { color: '#253638', fontSize: 16, fontWeight: '700' },
  requestDetail: { color: '#536669', fontSize: 13, marginTop: 5 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  declineButton: { alignItems: 'center', borderColor: '#7A4242', borderRadius: 6, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 42 },
  declineLabel: { color: '#7A4242', fontSize: 14, fontWeight: '700' },
  acceptButton: { alignItems: 'center', backgroundColor: '#167E78', borderRadius: 6, flex: 1, justifyContent: 'center', minHeight: 42 },
  acceptLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  error: { color: '#9F2D28', fontSize: 14, marginTop: 12 },
});

export default ChildRequestsScreen;
