import os
import threading
import time
from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Only start background thread in the main worker process (prevents starting twice during dev reload)
        if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('RUN_MAIN'):
            threading.Thread(target=self.start_escalation_worker, daemon=True, name="EscalationWorker").start()

    def start_escalation_worker(self):
        # Import inside the method to avoid AppRegistryNotReady exception during startup
        from api.services.escalations import process_escalations
        print("--- Background Escalations Worker thread started successfully ---")
        
        # Initial short sleep to let Django server boot up completely
        time.sleep(15)
        
        while True:
            try:
                print("Escalation Worker: Scanning for overdue complaints...")
                process_escalations()
            except Exception as e:
                print(f"Escalation Worker error: {str(e)}")
            
            # Sleep for 1 hour (3600 seconds)
            time.sleep(3600)
