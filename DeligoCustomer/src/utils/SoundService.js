/**
 * Sound Service
 * 
 * Manages audio playback for notifications using the new expo-audio package.
 * Optimized for SDK 54+ with modern interruption mode handling.
 */

import { AudioModule, createAudioPlayer } from 'expo-audio';
import { InteractionManager } from 'react-native';

let audioPlayer = null;
let isPlaying = false;

const SoundService = {
    /**
     * Loads and plays the notification sound using the modern expo-audio API.
     * @param {boolean} loop - Whether to loop the sound
     */
    playNotificationSound: async (loop = false) => {
        try {
            // Prevent concurrent playback hits
            if (isPlaying) {
                console.log('⏭️ Sound already playing, skipping...');
                return;
            }

            isPlaying = true;

            // Ensure smooth transitions by waiting for interactions
            InteractionManager.runAfterInteractions(async () => {
                try {
                    // Release existing player resources if any
                    if (audioPlayer) {
                        try {
                            audioPlayer.pause();
                        } catch (e) { }
                        audioPlayer = null;
                    }

                    // Configure modern audio session
                    await AudioModule.setAudioModeAsync({
                        playsInSilentMode: true,
                        shouldPlayInBackground: true,
                        interruptionMode: 'doNotMix',
                    });

                    // Create new player instance
                    const player = createAudioPlayer(require('../assets/sounds/notification_sound.wav'));
                    
                    // Set looping preference
                    player.loop = loop;
                    
                    // Start playback
                    player.play();
                    audioPlayer = player;

                    console.log('✅ Notification sound playing (expo-audio)...');
                } catch (error) {
                    isPlaying = false;
                    console.warn('❌ Failed to play notification sound (AudioModule):', error.message);
                } finally {
                    // Reset playing state after a reasonable buffer
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
     * Stops and releases the currently playing sound.
     */
    stopNotificationSound: async () => {
        try {
            isPlaying = false;
            if (audioPlayer) {
                audioPlayer.pause();
                audioPlayer = null;
                console.log('🔇 Notification sound stopped');
            }
        } catch (error) {
            console.warn('Failed to stop sound:', error.message);
        }
    },
};

export default SoundService;

