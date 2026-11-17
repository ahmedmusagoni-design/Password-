import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppDispatch } from '../store';
import { setUser } from '../store/slices/authSlice';
import { parentApi } from '../services/ParentApi';

type AccountRole = 'parent' | 'child';

const AuthScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const [role, setRole] = useState<AccountRole>('parent');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [childConsent, setChildConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async () => {
    setLoading(true);
    setError(null);
    try {
      if (role === 'child' && !childConsent) {
        throw new Error('Review and accept the device-linking notice before continuing.');
      }
      const user = role === 'child'
        ? await parentApi.linkChild(childName, inviteCode)
        : creatingAccount
          ? await parentApi.registerParent(parentName, email, password)
          : await parentApi.signIn(email, password);
      dispatch(setUser({ userId: user.id, userType: user.role }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text nativeID="auth-title" style={styles.title} testID="auth-title">Parental Control</Text>
        <Text style={styles.description}>
          A family dashboard for shared daily summaries and child-initiated SOS alerts.
        </Text>

        <View style={styles.roleSwitch} accessibilityRole="tablist">
          {(['parent', 'child'] as const).map((nextRole) => (
            <Pressable
              key={nextRole}
              accessibilityRole="tab"
              accessibilityState={{ selected: role === nextRole }}
              onPress={() => {
                setRole(nextRole);
                setChildConsent(false);
                setError(null);
              }}
              style={[styles.roleOption, role === nextRole && styles.selectedRole]}
            >
              <Text style={[styles.roleLabel, role === nextRole && styles.selectedRoleLabel]}>
                {nextRole === 'parent' ? 'Parent' : 'Child device'}
              </Text>
            </Pressable>
          ))}
        </View>

        {role === 'parent' ? (
          <>
            {creatingAccount && (
              <TextInput
                accessibilityLabel="Parent name"
                autoCapitalize="words"
                onChangeText={setParentName}
                placeholder="Your name"
                style={styles.input}
                value={parentName}
              />
            )}
            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email address"
              style={styles.input}
              textContentType="emailAddress"
              value={email}
            />
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete={creatingAccount ? 'new-password' : 'password'}
              onChangeText={setPassword}
              placeholder={creatingAccount ? 'Password (12+ characters)' : 'Password'}
              secureTextEntry
              style={styles.input}
              textContentType={creatingAccount ? 'newPassword' : 'password'}
              value={password}
            />
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={() => { setCreatingAccount((value) => !value); setError(null); }}
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>
                {creatingAccount ? 'Already have a family account? Sign in' : 'Create a parent account'}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              accessibilityLabel="Child name"
              autoCapitalize="words"
              onChangeText={setChildName}
              placeholder="Child name"
              style={styles.input}
              value={childName}
            />
            <TextInput
              accessibilityLabel="One-time family invite code"
              autoCapitalize="none"
              keyboardType="number-pad"
              maxLength={8}
              onChangeText={setInviteCode}
              placeholder="8-digit invite code"
              style={styles.input}
              value={inviteCode}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: childConsent }}
              onPress={() => setChildConsent((accepted) => !accepted)}
              style={styles.consent}
            >
              <View style={[styles.checkbox, childConsent && styles.checkboxChecked]}>
                {childConsent && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>
                I understand this links the device to the family that shared the code. The app can show
                only summaries or SOS information I choose to send through the child app; it does not
                read messages, monitor app use, or share background location. If my parent sets it up,
                selected apps may be paused on iOS after separate Screen Time approval on this device.
              </Text>
            </Pressable>
          </>
        )}

        <Text nativeID="privacy-disclosure" style={styles.privacyNote} testID="privacy-disclosure">
          Device linking is optional. The parent can remove this device later. This app does not read
          messages or app usage, or track location in the background. On iOS only, separately approved
          Screen Time settings can pause apps selected on this device; this does not shut down the device.
          SOS location is optional and requested only after a child starts an SOS.
        </Text>

        {!parentApi.isConfigured && (
          <Text style={styles.error}>
            Set EXPO_PUBLIC_PARENT_API_URL and restart the app to connect to the family server.
          </Text>
        )}
        {parentApi.isConfigured && !parentApi.canSignIn && (
          <Text style={styles.error}>
            Secure family sign-in is currently supported on iOS and Android only.
          </Text>
        )}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={loading || !parentApi.canSignIn || (role === 'child' && !childConsent)}
          onPress={authenticate}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || loading || !parentApi.canSignIn || (role === 'child' && !childConsent))
              && styles.primaryButtonMuted,
          ]}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.primaryButtonLabel}>
              {role === 'child' ? 'Link this device' : creatingAccount ? 'Create family account' : 'Sign in'}
            </Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F7' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#253638', fontSize: 28, fontWeight: '700', marginBottom: 8 },
  description: { color: '#536669', fontSize: 15, lineHeight: 22, marginBottom: 28 },
  roleSwitch: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#D8E0E0', marginBottom: 20 },
  roleOption: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  selectedRole: { borderBottomWidth: 3, borderBottomColor: '#167E78' },
  roleLabel: { color: '#647477', fontSize: 15, fontWeight: '600' },
  selectedRoleLabel: { color: '#176A65' },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D3D3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#203033',
    fontSize: 16,
    marginBottom: 12,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  textButton: { alignSelf: 'flex-start', marginBottom: 18, paddingVertical: 8 },
  textButtonLabel: { color: '#176A65', fontSize: 14, fontWeight: '600' },
  privacyNote: { color: '#46585B', fontSize: 13, lineHeight: 19, marginVertical: 12 },
  consent: { alignItems: 'flex-start', flexDirection: 'row', marginVertical: 8, paddingVertical: 6 },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#829293',
    borderRadius: 4,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    width: 22,
  },
  checkboxChecked: { backgroundColor: '#167E78', borderColor: '#167E78' },
  checkmark: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', lineHeight: 18 },
  consentText: { color: '#34494B', flex: 1, fontSize: 13, lineHeight: 19 },
  error: { color: '#9F2D28', fontSize: 14, lineHeight: 20, marginVertical: 8 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#167E78',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 52,
  },
  primaryButtonMuted: { opacity: 0.55 },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

export default AuthScreen;
