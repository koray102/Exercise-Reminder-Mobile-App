import { useState, useEffect, useRef } from 'react';
import { Alert, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Exercise } from '../types';
import { getExercisesByCategory } from '../repositories/ExerciseRepository';
import { getCategoryById, updateCategoryLastCompleted } from '../repositories/CategoryRepository';
import { getSettings } from '../repositories/SettingsRepository';
import { onRoutineCompleted } from '../services/streakService';
import { scheduleAllNotifications } from '../services/notificationService';
import { useApp } from '../contexts/AppContext';
import { Config } from '../constants/config';

const SOUND_BEEP = require('../assets/sounds/beep.mp3');
const SOUND_FINISH = require('../assets/sounds/finish.mp3');

export type Phase = 'prep' | 'active' | 'finished' | 'completed';

export function useExerciseSession(categoryId: string | undefined) {
  const router = useRouter();
  const { refreshStreaks, refreshData } = useApp();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('prep');
  const [remainingSeconds, setRemainingSeconds] = useState(Config.PREP_DURATION_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSide, setCurrentSide] = useState<'left' | 'right'>('left');
  const hapticsEnabled = useRef(true);
  const vibrationIntensity = useRef<'low' | 'medium' | 'high'>('low');
  const soundEnabled = useRef(true);
  const soundVolume = useRef<'low' | 'medium' | 'high'>('medium');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exercisesRef = useRef<Exercise[]>([]);

  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  useEffect(() => {
    loadExercises();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [categoryId]);

  const loadExercises = async () => {
    if (!categoryId) return;
    try {
      const settings = await getSettings();
      hapticsEnabled.current = !!settings.haptics_enabled;
      vibrationIntensity.current = settings.vibration_intensity || 'low';
      if (settings.sound_enabled !== undefined) {
        soundEnabled.current = !!settings.sound_enabled;
      }
      if (settings.sound_volume) {
        soundVolume.current = settings.sound_volume;
      }

      const cat = await getCategoryById(categoryId);
      if (cat) setCategoryTitle(cat.title);

      const exList = await getExercisesByCategory(categoryId);
      setExercises(exList);
      exercisesRef.current = exList;

      if (exList.length === 0) {
        Alert.alert('Error', 'No exercises found in this category.');
        router.back();
        return;
      }

      setIsLoading(false);
      await updateCategoryLastCompleted(categoryId, new Date().toISOString());
      await refreshData();

      startPrepPhaseWithRef(exList);
    } catch (error) {
      console.error('Load error:', error);
      router.back();
    }
  };

  const startPrepPhaseWithRef = (exList: Exercise[]) => {
    setPhase('prep');
    setRemainingSeconds(Config.PREP_DURATION_SECONDS);
    startTimer(Config.PREP_DURATION_SECONDS, () => {
      const firstEx = exList[0];
      setPhase('active');
      if (firstEx?.type === 'reps') {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        const duration = firstEx?.duration_seconds ?? 30;
        setRemainingSeconds(duration);
        startTimer(duration, () => setPhase('finished'));
      }
    });
  };

  const playSound = async (type: 'beep' | 'finish') => {
    if (!soundEnabled.current) return;
    try {
      const asset = type === 'beep' 
        ? SOUND_BEEP 
        : SOUND_FINISH;
      
      const { sound } = await Audio.Sound.createAsync(asset);
      const volumeValue = soundVolume.current === 'low' ? 0.3 : soundVolume.current === 'medium' ? 0.6 : 1.0;
      await sound.setVolumeAsync(volumeValue);
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  const startTimer = (seconds: number, onComplete: () => void) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let remaining = seconds;
    setRemainingSeconds(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setRemainingSeconds(remaining);

      if (hapticsEnabled.current) {
        if (remaining === 3 || remaining === 2 || remaining === 1) {
          playSound('beep');
          if (vibrationIntensity.current === 'low') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else if (vibrationIntensity.current === 'medium') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Vibration.vibrate(200);
          } else if (vibrationIntensity.current === 'high') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            Vibration.vibrate(400);
          }
        } else if (remaining === 0) {
          playSound('finish');
          if (vibrationIntensity.current === 'low') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (vibrationIntensity.current === 'medium') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Vibration.vibrate(600);
          } else if (vibrationIntensity.current === 'high') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Vibration.vibrate([0, 800, 200, 800]);
          }
        }
      } else {
        // Even if haptics is disabled, play sound if enabled
        if (remaining === 3 || remaining === 2 || remaining === 1) {
          playSound('beep');
        } else if (remaining === 0) {
          playSound('finish');
        }
      }

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        onComplete();
      }
    }, 1000);
  };

  const startExerciseAtIndex = (index: number, side: 'left' | 'right' = 'left') => {
    const ex = exercisesRef.current[index];
    if (!ex) return;

    setCurrentIndex(index);
    setCurrentSide(side);
    setPhase('prep');
    setRemainingSeconds(Config.PREP_DURATION_SECONDS);

    setTimeout(() => {
      startTimer(Config.PREP_DURATION_SECONDS, () => {
        setPhase('active');
        if (ex.type === 'reps') {
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          const duration = ex.duration_seconds ?? 30;
          setRemainingSeconds(duration);
          startTimer(duration, () => setPhase('finished'));
        }
      });
    }, 100);
  };

  const handleFinish = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const currentExercise = exercisesRef.current[currentIndex];

    if (currentExercise?.is_two_sided && currentSide === 'left') {
      startExerciseAtIndex(currentIndex, 'right');
      return;
    }

    setCurrentSide('left');
    const nextIndex = currentIndex + 1;

    if (nextIndex >= exercisesRef.current.length) {
      setPhase('completed');
      try {
        if (categoryId) {
          await onRoutineCompleted(categoryId);
          await refreshStreaks();
          await refreshData();
          await scheduleAllNotifications();
        }
      } catch (error) {
        console.error('Streak update error:', error);
      }
    } else {
      startExerciseAtIndex(nextIndex, 'left');
    }
  };

  const handleExit = () => {
    Alert.alert(
      'Exit',
      'Are you sure you want to quit? This won\'t affect your streak.',
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            router.back();
          },
        },
      ]
    );
  };

  const handleSkipTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const currentExercise = exercises[currentIndex];
    if (currentExercise?.type === 'reps') {
      handleFinish();
    } else {
      setPhase('finished');
    }
  };

  const currentExercise = exercises[currentIndex];
  const totalDuration = phase === 'prep'
    ? Config.PREP_DURATION_SECONDS
    : currentExercise?.duration_seconds ?? 30;

  return {
    exercises, categoryTitle, currentIndex, phase, remainingSeconds, isLoading, currentSide, currentExercise, totalDuration,
    handleFinish, handleExit, handleSkipTimer, router
  };
}
