const NotificationSystem = (function() {
    // Container für alle Benachrichtigungen erstellen
    let container = null;
    let notificationCount = 0;
    const maxNotifications = 5; // Maximale Anzahl gleichzeitiger Benachrichtigungen
    const notificationQueue = []; // Warteschlange für überschüssige Benachrichtigungen
    
    // Container initialisieren
    function initContainer() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }
    
    // Benachrichtigung erstellen und anzeigen
    function show(title, message, type = 'info', duration = 5000) {
        // Container initialisieren
        const notificationContainer = initContainer();
        
        // Wenn zu viele Benachrichtigungen angezeigt werden, zur Warteschlange hinzufügen
        if (notificationCount >= maxNotifications) {
            notificationQueue.push({ title, message, type, duration });
            return;
        }
        
        // Benachrichtigungszähler erhöhen
        notificationCount++;
        
        // Benachrichtigung erstellen
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Inhalt der Benachrichtigung
        notification.innerHTML = `
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
            <div class="notification-close">&times;</div>
            <div class="notification-progress">
                <div class="notification-progress-bar"></div>
            </div>
        `;
        
        // Benachrichtigung zum Container hinzufügen
        notificationContainer.appendChild(notification);
        
        // Fortschrittsbalken animieren
        const progressBar = notification.querySelector('.notification-progress-bar');
        progressBar.style.width = '100%';
        progressBar.style.transitionDuration = `${duration}ms`;
        
        // Benachrichtigung anzeigen (mit Animation)
        setTimeout(() => {
            notification.classList.add('show');
            progressBar.style.width = '0%';
        }, 10);
        
        // Schließen-Button Funktionalität
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            removeNotification(notification);
        });
        
        // Automatisches Entfernen nach der angegebenen Zeit
        const timeoutId = setTimeout(() => {
            removeNotification(notification);
        }, duration);
        
        // Speichern der Timeout-ID für mögliches vorzeitiges Entfernen
        notification.dataset.timeoutId = timeoutId;
        
        return notification;
    }
    
    // Benachrichtigung entfernen
    function removeNotification(notification) {
        // Timeout löschen, falls vorhanden
        const timeoutId = notification.dataset.timeoutId;
        if (timeoutId) {
            clearTimeout(parseInt(timeoutId));
        }
        
        // Animation zum Ausblenden
        notification.classList.remove('show');
        
        // Nach der Animation entfernen
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
                
                // Benachrichtigungszähler verringern
                notificationCount--;
                
                // Nächste Benachrichtigung aus der Warteschlange anzeigen, falls vorhanden
                if (notificationQueue.length > 0) {
                    const next = notificationQueue.shift();
                    show(next.title, next.message, next.type, next.duration);
                }
            }
        }, 300);
    }
    
    // Alle Benachrichtigungen entfernen
    function clearAll() {
        if (container) {
            const notifications = container.querySelectorAll('.notification');
            notifications.forEach(notification => {
                removeNotification(notification);
            });
            
            // Warteschlange leeren
            notificationQueue.length = 0;
        }
    }
    
    // Öffentliche API
    return {
        show,
        clearAll
    };
})();

// Hilfsfunktion zum Anzeigen von Benachrichtigungen
function showNotification(title, message, type = 'info', duration = 5000) {
    NotificationSystem.show(title, message, type, duration);
}

ipcRenderer.on('notification', (event, { title, message, type, duration }) => {
    showNotification(title, message, type, duration)
});