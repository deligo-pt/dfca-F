const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withResolvedFirebaseIconColor(config) {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;

        // Ensure the application object exists
        if (!androidManifest.manifest.application || !androidManifest.manifest.application[0]) {
            return config;
        }

        const mainApplication = androidManifest.manifest.application[0];
        const metaDataName = 'com.google.firebase.messaging.default_notification_color';

        // Ensure meta-data array exists
        if (!mainApplication['meta-data']) {
            mainApplication['meta-data'] = [];
        }

        // Find if the metadata already exists (added by expo-notifications)
        let metaDatum = mainApplication['meta-data'].find(
            (md) => md.$['android:name'] === metaDataName
        );

        if (!metaDatum) {
            // If not found, create it (though expo-notifications should have added it)
            // We add it with our desired configuration just in case
            metaDatum = {
                $: {
                    'android:name': metaDataName,
                    'android:resource': '@color/notification_icon_color',
                    'tools:replace': 'android:resource',
                }
            };
            mainApplication['meta-data'].push(metaDatum);
        } else {
            // If found, just add/update the tools:replace attribute
            metaDatum.$['tools:replace'] = 'android:resource';
        }

        // Add xmlns:tools to the manifest tag if missing
        if (!androidManifest.manifest.$['xmlns:tools']) {
            androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
        }

        return config;
    });
};
