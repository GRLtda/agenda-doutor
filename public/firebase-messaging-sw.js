// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// REPLACE THESE WITH YOUR ACTUAL CONFIG IF YOU WANT BACKGROUND SUPORT
const firebaseConfig = {
    apiKey: "AIzaSyAm0bcAQptmGKh20Er8rGikY5cnKWIF3js",
    authDomain: "fcm-agenda-doutor.firebaseapp.com",
    projectId: "fcm-agenda-doutor",
    storageBucket: "fcm-agenda-doutor.firebasestorage.app",
    messagingSenderId: "610604859153",
    appId: "1:610604859153:web:18c58685b3420eb2cd96b0"
};

try {
    if (firebase.apps.length === 0) {
        firebase.initializeApp(firebaseConfig);
        const messaging = firebase.messaging();

        messaging.onBackgroundMessage((payload) => {
            console.log('[firebase-messaging-sw.js] Received background message ', payload);
            const notificationTitle = payload.notification.title || payload.data?.title;
            const notificationOptions = {
                body: payload.notification.body || payload.data?.body,
                icon: payload.data?.icon || '/apple-touch-icon.png',
                data: payload.data
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });
    }
} catch (e) {
    console.log('Firebase SW init error:', e);
}

// Lidar com clique na notificação em Background
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    // Pega a URL vinda do data payload, se existir, senão vai pro root do app.
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Tenta focar se já tiver o app aberto
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    // Update URL if needed or just focus
                    if (urlToOpen !== '/') client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            // Se nenhuma aba/janela estiver aberta, abre uma nova
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
