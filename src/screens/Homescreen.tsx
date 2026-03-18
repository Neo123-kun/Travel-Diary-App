import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDiary, TravelEntry } from '../context/Diarycontext';
import { useTheme } from '../context/Themecontext';
import { createHomeStyles } from '../screenDesigns/Homestyles';

interface HomeScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { entries, removeEntry, isLoading, error, clearError } = useDiary();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = createHomeStyles(colors);

  const handleRemove = useCallback(
    (id: string, address: string) => {
      Alert.alert(
        'Remove Entry',
        `Remove the entry at "${address}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeEntry(id),
          },
        ]
      );
    },
    [removeEntry]
  );

  const formatDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderEntry = useCallback(
    ({ item }: { item: TravelEntry }) => (
      <View style={styles.entryCard}>
        <Image
          source={{ uri: item.photoUri }}
          style={styles.entryImage}
          resizeMode="cover"
          accessibilityLabel={`Travel photo at ${item.address}`}
        />
        <View style={styles.entryFooter}>
          <View style={styles.entryInfo}>
            <View style={styles.entryAddressRow}>
              <Text style={styles.pinIcon}>📍</Text>
              <Text style={styles.entryAddress} numberOfLines={2}>
                {item.address}
              </Text>
            </View>
            <Text style={styles.entryDate}>{formatDate(item.timestamp)}</Text>
          </View>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemove(item.id, item.address)}
            accessibilityLabel={`Remove entry at ${item.address}`}
            accessibilityRole="button"
          >
            <Text style={styles.removeButtonText}>✕ Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [styles, handleRemove]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>🗺️</Text>
      </View>
      <Text style={styles.emptyTitle}>No Entries Yet</Text>
      <Text style={styles.emptyText}>
        Start capturing your travel memories!{'\n'}Tap the + button to add your
        first entry.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.headerBg}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>✈ Travel Diary</Text>
          <Text style={styles.headerSubtitle}>Your journey, captured.</Text>
          {entries.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {entries.length} {entries.length === 1 ? 'memory' : 'memories'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {/* Dark/Light Mode Toggle */}
          <TouchableOpacity
            style={styles.themeToggle}
            onPress={toggleTheme}
            accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            accessibilityRole="switch"
          >
            <View
              style={[
                styles.themeToggleThumb,
                isDark && styles.themeToggleThumbDark,
              ]}
            />
          </TouchableOpacity>
          <Text style={{ fontSize: 14 }}>{isDark ? '🌙' : '☀️'}</Text>
          {/* Add Entry Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddEntry')}
            accessibilityLabel="Add new travel entry"
            accessibilityRole="button"
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.errorBannerDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your memories…</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={[
            styles.listContent,
            entries.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;