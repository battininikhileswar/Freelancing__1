import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { getOfflineComplaints, deleteOfflineComplaint } from '../utils/indexedDb';

export default function OfflineSyncManager() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    total: 0,
    current: 0,
    success: false,
    error: false,
  });

  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('📡 Network restored! Starting auto-sync...', { id: 'network-status' });
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
      toast.error('🔌 Network disconnected. Storing reports locally.', { id: 'network-status' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    if (navigator.onLine) {
      triggerSync();
    } else {
      setShowStatus(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    try {
      const queue = await getOfflineComplaints();
      if (queue.length === 0) {
        setSyncState({ isSyncing: false, total: 0, current: 0, success: false, error: false });
        return;
      }

      console.log(`📡 Found ${queue.length} offline complaints queued for synchronization.`);
      setSyncState({
        isSyncing: true,
        total: queue.length,
        current: 0,
        success: false,
        error: false
      });
      setShowStatus(true);

      let processedCount = 0;
      let successCount = 0;

      for (const report of queue) {
        try {
          if (report.isEmergency) {
            // Emergency broadcast schemas (JSON)
            const reportData = {
              category: report.category,
              subcategory: report.subcategory,
              description: report.description,
              isAnonymous: report.isAnonymous,
              location: report.location,
              isEmergency: true,
              severity: 'Emergency',
            };
            await api.post('/complaints', reportData, { silent: true });
          } else {
            // Standard complaints with attachment support
            const formData = new FormData();
            formData.append('category', report.category);
            formData.append('subcategory', report.subcategory);
            formData.append('description', report.description);
            formData.append('isAnonymous', report.isAnonymous);
            formData.append('location', JSON.stringify(report.location));

            if (report.offlineFiles && report.offlineFiles.length > 0) {
              report.offlineFiles.forEach((fileObj) => {
                const blob = fileObj.blob || new Blob([], { type: fileObj.type });
                formData.append('attachments', blob, fileObj.name);
              });
            }

            await api.post('/complaints', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              silent: true
            });
          }

          // Delete from IndexedDB upon success
          if (report.localId) {
            await deleteOfflineComplaint(report.localId);
          }
          successCount++;
        } catch (singleErr) {
          console.error('❌ Failed to sync individual complaint:', report, singleErr);
          // If the server explicitly responded with an error, it is a permanent rejection (e.g. validation error or duplicate).
          // We must delete it from IndexedDB so it doesn't get stuck in the queue and retry infinitely.
          if (singleErr.response && report.localId) {
            console.warn('⚠️ Server permanently rejected report. Removing from offline queue:', singleErr.response.data?.message);
            await deleteOfflineComplaint(report.localId);
          }
        }

        processedCount++;
        setSyncState(prev => ({ ...prev, current: processedCount }));
      }

      if (successCount > 0) {
        setSyncState(prev => ({ ...prev, isSyncing: false, success: true }));
        toast.success(`📡 Auto-sync completed! ${successCount} reports synchronized with Guntur City servers.`);
        
        // Invalidate queries so dashboards reload seamlessly
        queryClient.invalidateQueries(['myComplaints']);
        queryClient.invalidateQueries(['adminComplaints']);
        queryClient.invalidateQueries(['heatmapData']);
        
        // Hide success banner after 4 seconds
        setTimeout(() => {
          setShowStatus(false);
          setSyncState(prev => ({ ...prev, success: false }));
        }, 4000);
      } else {
        // None succeeded
        setSyncState(prev => ({ ...prev, isSyncing: false, error: true }));
        console.warn('⚠️ Background auto-sync failed to dispatch queued reports.');
        setTimeout(() => {
          setShowStatus(false);
          setSyncState(prev => ({ ...prev, error: false }));
        }, 5000);
      }

    } catch (err) {
      console.error('OfflineSyncManager error during sync:', err);
      setSyncState(prev => ({ ...prev, isSyncing: false, error: true }));
    }
  };

  if (!showStatus && isOnline) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.9 }}
        className="fixed bottom-6 left-6 z-[100] max-w-sm w-80 font-sans"
      >
        {!isOnline ? (
          /* Offline Alert Banner in Clay Morphism Mode */
          <div
            className="p-4 rounded-3xl bg-amber-500/10 backdrop-blur-md border border-amber-500/30 shadow-xl flex items-center gap-3.5"
            style={{
              boxShadow: 'var(--clay-shadow-md), inset 0 0 12px rgba(245, 158, 11, 0.15)',
              borderRadius: '24px'
            }}
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
              <WifiOff size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest">
                Offline Mode
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-tight mt-0.5">
                Report portal saved locally. Submissions will auto-sync on recovery.
              </div>
            </div>
          </div>
        ) : syncState.isSyncing ? (
          /* Syncing State Floating Card */
          <div
            className="p-4 rounded-3xl bg-indigo-500/10 backdrop-blur-md border border-indigo-500/30 shadow-xl flex items-center gap-3.5"
            style={{
              boxShadow: 'var(--clay-shadow-md), inset 0 0 12px rgba(99, 102, 241, 0.15)',
              borderRadius: '24px'
            }}
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
              <Loader2 size={18} className="animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest">
                Auto-Syncing Queue
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold mt-0.5">
                Dispatching report {syncState.current} of {syncState.total}...
              </div>
              {/* Simple Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <motion.div
                  className="bg-indigo-500 h-full rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(syncState.current / syncState.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        ) : syncState.success ? (
          /* Sync Success State Floating Card */
          <div
            className="p-4 rounded-3xl bg-green-500/10 backdrop-blur-md border border-green-500/30 shadow-xl flex items-center gap-3.5"
            style={{
              boxShadow: 'var(--clay-shadow-md), inset 0 0 12px rgba(34, 197, 94, 0.15)',
              borderRadius: '24px'
            }}
          >
            <div className="w-10 h-10 rounded-2xl bg-green-500 text-white flex items-center justify-center flex-shrink-0">
              <CheckCircle size={18} className="animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-widest">
                Sync Completed
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold mt-0.5">
                All offline reports successfully uploaded!
              </div>
            </div>
          </div>
        ) : syncState.error ? (
          /* Sync Failure State Floating Card */
          <div
            className="p-4 rounded-3xl bg-red-500/10 backdrop-blur-md border border-red-500/30 shadow-xl flex items-center gap-3.5"
            style={{
              boxShadow: 'var(--clay-shadow-md), inset 0 0 12px rgba(239, 68, 68, 0.15)',
              borderRadius: '24px'
            }}
          >
            <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-widest">
                Sync Interrupted
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold mt-0.5">
                Failed to sync some reports. Re-queue active.
              </div>
            </div>
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
