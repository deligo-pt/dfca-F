import { Audio } from 'expo-av';
import { InteractionManager } from 'react-native';

let soundObject = null;
let isPlaying = false;

const SoundService = {
    /**
     * Loads and plays the notification sound.
     * @param {boolean} loop - Whether to loop the sound
     */
    playNotificationSound: async (loop = false) => {
        try {
            // Prevent multiple simultaneous plays
            if (isPlaying) {
                console.log('⏭️ Sound already playing, skipping...');
                return;
            }

            isPlaying = true;

            // Wait for any animations/interactions to complete before playing sound
            InteractionManager.runAfterInteractions(async () => {
                try {
                    // Unload existing sound if any
                    if (soundObject) {
                        try {
                            await soundObject.unloadAsync();
                        } catch (e) {
                            console.warn('Cleanup warning:', e.message);
                        }
                        soundObject = null;
                    }

                    // Configure audio mode to play even if device is on silent
                    await Audio.setAudioModeAsync({
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: true,
                        shouldDuckAndroid: true,
                        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
                    });

                    const { sound } = await Audio.Sound.createAsync(
                        require('../assets/sounds/notification_sound.wav'),
                        { shouldPlay: true, isLooping: loop }
                    );

                    soundObject = sound;

                    // Auto-cleanup when sound finishes playing
                    sound.setOnPlaybackStatusUpdate((status) => {
                        if (status.didJustFinish && !status.isLooping) {
                            isPlaying = false;
                            sound.unloadAsync().catch(() => {});
                        }
                    });

                    console.log('✅ Notification sound playing...');
                } catch (error) {
                    isPlaying = false;
                    console.warn('❌ Failed to play notification sound:', error.message);
                } finally {
                    // Reset playing flag after a short delay
                    setTimeout(() => {
                        isPlaying = false;
                    }, 2000);
                }
            });
        } catch (error) {
            isPlaying = false;
            console.warn('❌ Sound service error:', error.message);
        }
    },

    /**
     * Stops the currently playing sound.
     */
    stopNotificationSound: async () => {
        try {
            isPlaying = false;
            if (soundObject) {
                await soundObject.stopAsync();
                await soundObject.unloadAsync();
                soundObject = null;
                console.log('🔇 Notification sound stopped');
            }
        } catch (error) {
            console.warn('Failed to stop sound:', error.message);
        }
    },
};

export default SoundService;

