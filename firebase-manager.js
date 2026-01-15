// firebase-manager.js - Firebase manager with better error handling
(function () {
    'use strict';

    // CONFIG
    if (!window.CONFIG) {
        window.CONFIG = {
            startDate: new Date(2026, 0, 1, 0, 0, 0),
            coupleNames: {
                person1: "Hung Duong",
                person2: "Thuy Hang"
            },
            loveMessages: [
                "Anh yêu em nhiều lắm! 💖",
                "Mỗi ngày bên em là một ngày hạnh phúc!",
                "Cảm ơn em vì đã đến bên anh!",
                "Hạnh phúc nhất là được ở bên em!"
            ],
            defaultPhotos: [
                {
                    id: '1',
                    url: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80',
                    caption: 'Ngày đầu tiên',
                    uploadedAt: new Date().toISOString()
                }
            ]
        };
    }

    class FirebaseManager {
        constructor() {
            this.COUPLE_ID = this.getCoupleId();
            this.db = null;
            this.collectionRef = null;
            this.isOnline = navigator.onLine;
            this.unsubscribe = null;
            this.retryCount = 0;
            this.maxRetries = 3;

            // Load từ localStorage trước (cho nhanh)
            const cachedData = this.loadFromLocalStorage();
            this.currentData = cachedData || this.getDefaultData();

            console.log('🔥 FirebaseManager initializing...');

            // Khởi tạo Firebase (bất đồng bộ)
            setTimeout(() => this.initFirebase(), 500);
        }

        getCoupleId() {
            const urlParams = new URLSearchParams(window.location.search);
            let coupleId = urlParams.get('coupleId');

            if (!coupleId) {
                coupleId = localStorage.getItem('couple_id');

                if (!coupleId) {
                    coupleId = 'couple_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                    localStorage.setItem('couple_id', coupleId);

                    // Chỉ show notification sau khi app load xong
                    setTimeout(() => {
                        const shareLink = `${window.location.origin}${window.location.pathname}?coupleId=${coupleId}`;
                        this.showShareNotification(shareLink);
                    }, 2000);
                }
            } else {
                localStorage.setItem('couple_id', coupleId);
            }

            return coupleId;
        }

        showShareNotification(shareLink) {
            // Chỉ hiện khi chưa có dữ liệu
            if (!this.hasData()) {
                const shouldShare = confirm(`🎉 Tạo link thành công!\n\nCopy link này gửi cho người yêu:\n\n${shareLink}\n\nCopy link?`);
                
                if (shouldShare) {
                    navigator.clipboard.writeText(shareLink).then(() => {
                        alert('✅ Đã copy link! Gửi cho người yêu nhé!');
                    });
                }
            }
        }

        getDefaultData() {
            return {
                version: '3.0-firebase',
                lastUpdated: new Date().toISOString(),
                coupleInfo: {
                    person1: {
                        name: CONFIG.coupleNames.person1,
                        birthday: '',
                        favoriteColor: '#ff6b9d',
                        avatar: ''
                    },
                    person2: {
                        name: CONFIG.coupleNames.person2,
                        birthday: '',
                        favoriteColor: '#4d94ff',
                        avatar: ''
                    },
                    startDate: CONFIG.startDate.toISOString(),
                    specialDates: []
                },
                memories: [],
                photos: CONFIG.defaultPhotos,
                loveNotes: [],
                settings: {
                    theme: 'light',
                    notifications: true,
                    privateMode: false
                }
            };
        }

        initFirebase() {
            try {
                // Kiểm tra Firebase đã được load chưa
                if (typeof firebase === 'undefined') {
                    console.warn('Firebase SDK chưa được load');
                    if (this.retryCount < this.maxRetries) {
                        this.retryCount++;
                        setTimeout(() => this.initFirebase(), 1000);
                    } else {
                        this.useOfflineMode();
                    }
                    return;
                }

                // Khởi tạo Firebase app
                if (!firebase.apps.length) {
                    console.error('Firebase chưa được initialize');
                    this.useOfflineMode();
                    return;
                }

                // Khởi tạo services
                this.db = firebase.firestore();
                this.storage = firebase.storage();
                this.collectionRef = this.db.collection('couples').doc(this.COUPLE_ID);

                console.log('✅ Firebase services initialized');

                // Enable offline persistence
                this.enableOfflinePersistence();

                // Bắt đầu load data
                this.loadInitialData();

                // Start real-time sync
                this.startRealtimeSync();

            } catch (error) {
                console.error('❌ Lỗi khởi tạo Firebase:', error);
                this.useOfflineMode();
            }
        }

        async enableOfflinePersistence() {
            try {
                if (this.db && this.db.enablePersistence) {
                    await this.db.enablePersistence();
                    console.log('📱 Offline persistence enabled');
                }
            } catch (error) {
                console.warn('⚠️ Cannot enable offline persistence:', error);
            }
        }

        async loadInitialData() {
            try {
                console.log('📥 Đang tải data từ Firebase...');

                // Thử kết nối đến Firestore với timeout
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                );

                const docPromise = this.collectionRef.get();
                const doc = await Promise.race([docPromise, timeoutPromise]);

                if (doc.exists) {
                    const firebaseData = doc.data();
                    console.log('✅ Loaded from Firebase');

                    // Merge data
                    this.currentData = this.mergeData(this.currentData, firebaseData);
                    this.saveToLocalStorage(); // Cache lại

                    // Dispatch event khi có data
                    this.dispatchFirebaseReady(true);

                } else {
                    // Chưa có data trên Firebase, tạo mới
                    console.log('📝 No data on Firebase, creating new...');
                    await this.saveToFirebase();
                }

            } catch (error) {
                console.error('❌ Lỗi load từ Firebase:', error.message);
                
                if (this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    console.log(`🔄 Retrying... (${this.retryCount}/${this.maxRetries})`);
                    setTimeout(() => this.loadInitialData(), 2000);
                } else {
                    this.useOfflineMode();
                }
            }
        }

        useOfflineMode() {
            console.warn('⚠️ Switching to offline mode');
            this.isOnline = false;
            
            // Dùng data từ localStorage hoặc default
            const localData = this.loadFromLocalStorage();
            if (localData) {
                this.currentData = localData;
            }
            
            // Auto-save vào localStorage
            this.setupLocalStorageAutoSave();
            
            // Dispatch event với flag offline
            this.dispatchFirebaseReady(false);
            
            // Hiển thị nút retry
            this.showRetryButton();
        }

        dispatchFirebaseReady(online = true) {
            document.dispatchEvent(new CustomEvent('firebaseReady', {
                detail: { 
                    data: this.currentData, 
                    online: online,
                    coupleId: this.COUPLE_ID 
                }
            }));
            console.log('📢 Firebase ready event dispatched (online:', online, ')');
        }

        startRealtimeSync() {
            // Lắng nghe thay đổi real-time
            this.unsubscribe = this.collectionRef.onSnapshot((doc) => {
                if (doc.exists) {
                    const remoteData = doc.data();

                    // Chỉ cập nhật nếu data mới hơn
                    const currentTime = new Date(this.currentData.lastUpdated).getTime();
                    const remoteTime = new Date(remoteData.lastUpdated).getTime();

                    if (remoteTime > currentTime) {
                        console.log('🔄 Nhận update từ Firebase');
                        this.currentData = this.mergeData(this.currentData, remoteData);
                        this.saveToLocalStorage();

                        document.dispatchEvent(new CustomEvent('dataUpdated', {
                            detail: { data: this.currentData, source: 'firebase' }
                        }));
                    }
                }
            }, (error) => {
                console.error('❌ Lỗi real-time sync:', error);
            });
        }

        async saveToFirebase() {
            try {
                if (!this.collectionRef) {
                    throw new Error('Firebase chưa sẵn sàng');
                }

                this.currentData.lastUpdated = new Date().toISOString();

                await this.collectionRef.set(this.currentData, { merge: true });
                console.log('📤 Đã lưu lên Firebase');

                return true;
            } catch (error) {
                console.error('❌ Lỗi save Firebase:', error);
                
                // Fallback: lưu vào localStorage
                this.saveToLocalStorage();
                return false;
            }
        }

        mergeData(localData, remoteData) {
            const localTime = new Date(localData.lastUpdated).getTime();
            const remoteTime = new Date(remoteData.lastUpdated).getTime();

            if (remoteTime > localTime) {
                return { ...localData, ...remoteData };
            }

            return localData;
        }

        // ========== LOCALSTORAGE METHODS ==========

        saveToLocalStorage() {
            try {
                localStorage.setItem('love_anniversary_data', JSON.stringify(this.currentData));
                localStorage.setItem('love_last_sync', new Date().toISOString());
                console.log('💾 Saved to localStorage');
            } catch (error) {
                console.error('❌ Lỗi save localStorage:', error);
            }
        }

        loadFromLocalStorage() {
            try {
                const saved = localStorage.getItem('love_anniversary_data');
                if (saved) {
                    console.log('📂 Loaded from localStorage');
                    return JSON.parse(saved);
                }
            } catch (error) {
                console.error('❌ Lỗi load localStorage:', error);
            }
            return null;
        }

        setupLocalStorageAutoSave() {
            // Auto-save vào localStorage mỗi 10 giây
            setInterval(() => {
                if (!this.isOnline) {
                    this.saveToLocalStorage();
                }
            }, 10000);
        }

        hasData() {
            return this.currentData && 
                   (this.currentData.memories.length > 0 || 
                    this.currentData.photos.length > 0);
        }

        // ========== UI METHODS ==========

        showRetryButton() {
            const existingBtn = document.getElementById('retryFirebaseBtn');
            if (existingBtn) return;

            const retryBtn = document.createElement('button');
            retryBtn.id = 'retryFirebaseBtn';
            retryBtn.innerHTML = '<i class="fas fa-redo"></i>';
            retryBtn.title = 'Thử kết nối lại với Firebase';
            retryBtn.style.cssText = `
                position: fixed;
                bottom: 140px;
                right: 20px;
                background: #ff6b6b;
                color: white;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 16px;
                cursor: pointer;
                z-index: 9998;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;

            retryBtn.addEventListener('click', () => {
                console.log('🔄 User requested retry connection');
                retryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                this.retryCount = 0;
                setTimeout(() => {
                    this.initFirebase();
                    retryBtn.remove();
                }, 1000);
            });

            document.body.appendChild(retryBtn);
        }

        addShareButton() {
            // Chỉ thêm nếu chưa có
            if (document.getElementById('shareCoupleLink')) return;

            const shareBtn = document.createElement('button');
            shareBtn.id = 'shareCoupleLink';
            shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
            shareBtn.title = 'Chia sẻ link với người yêu';
            shareBtn.style.cssText = `
                position: fixed;
                bottom: 90px;
                right: 20px;
                background: linear-gradient(135deg, #4d94ff, #3366cc);
                color: white;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 16px;
                cursor: pointer;
                z-index: 9998;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;

            shareBtn.addEventListener('click', () => {
                const shareLink = this.getShareLink();
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareLink).then(() => {
                        const notification = document.createElement('div');
                        notification.innerHTML = '✅ Đã copy link!';
                        notification.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            background: #4CAF50;
                            color: white;
                            padding: 10px 20px;
                            border-radius: 5px;
                            z-index: 10000;
                            animation: slideIn 0.3s ease;
                        `;
                        document.body.appendChild(notification);
                        setTimeout(() => notification.remove(), 3000);
                    });
                } else {
                    // Fallback cho browser cũ
                    const textarea = document.createElement('textarea');
                    textarea.value = shareLink;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    alert('✅ Đã copy link!\n\nGửi link này cho người yêu:\n' + shareLink);
                }
            });

            document.body.appendChild(shareBtn);
        }

        // ========== CRUD METHODS ==========

        async addMemory(memory) {
            const newMemory = {
                id: this.generateId(),
                date: new Date().toISOString().split('T')[0],
                createdDate: new Date().toISOString(),
                createdBy: 'Bạn',
                ...memory
            };

            this.currentData.memories.unshift(newMemory);
            
            // Thử lưu lên Firebase, nếu fail thì lưu local
            if (this.isOnline) {
                await this.saveToFirebase();
            } else {
                this.saveToLocalStorage();
            }

            document.dispatchEvent(new CustomEvent('memoryAdded', { detail: newMemory }));
            return newMemory;
        }

        async addPhoto(photo) {
            const newPhoto = {
                id: this.generateId(),
                uploadedAt: new Date().toISOString(),
                ...photo
            };

            this.currentData.photos.unshift(newPhoto);
            
            if (this.isOnline) {
                await this.saveToFirebase();
            } else {
                this.saveToLocalStorage();
            }

            document.dispatchEvent(new CustomEvent('photoAdded', { detail: newPhoto }));
            return newPhoto;
        }

        async updateMemory(memoryId, updates) {
            const index = this.currentData.memories.findIndex(m => m.id === memoryId);
            if (index !== -1) {
                this.currentData.memories[index] = {
                    ...this.currentData.memories[index],
                    ...updates,
                    updatedDate: new Date().toISOString()
                };

                if (this.isOnline) {
                    await this.saveToFirebase();
                } else {
                    this.saveToLocalStorage();
                }
                
                document.dispatchEvent(new CustomEvent('memoryUpdated', {
                    detail: { id: memoryId, ...updates }
                }));
                return true;
            }
            return false;
        }

        async deleteMemory(memoryId) {
            const initialLength = this.currentData.memories.length;
            this.currentData.memories = this.currentData.memories.filter(m => m.id !== memoryId);

            if (this.currentData.memories.length < initialLength) {
                if (this.isOnline) {
                    await this.saveToFirebase();
                } else {
                    this.saveToLocalStorage();
                }
                
                document.dispatchEvent(new CustomEvent('memoryDeleted', { detail: memoryId }));
                return true;
            }
            return false;
        }

        async deletePhoto(photoId) {
            const initialLength = this.currentData.photos.length;
            this.currentData.photos = this.currentData.photos.filter(p => p.id !== photoId);

            if (this.currentData.photos.length < initialLength) {
                if (this.isOnline) {
                    await this.saveToFirebase();
                } else {
                    this.saveToLocalStorage();
                }
                
                document.dispatchEvent(new CustomEvent('photoDeleted', { detail: photoId }));
                return true;
            }
            return false;
        }

        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }

        getStats() {
            const startDate = new Date(this.currentData.coupleInfo.startDate);
            const today = new Date();

            const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

            const diffTime = todayUTC - startUTC;
            const daysTogether = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

            return {
                totalMemories: this.currentData.memories.length,
                totalPhotos: this.currentData.photos.length,
                daysTogether: daysTogether,
                coupleId: this.COUPLE_ID,
                isOnline: this.isOnline
            };
        }

        getShareLink() {
            return `${window.location.origin}${window.location.pathname}?coupleId=${this.COUPLE_ID}`;
        }

        cleanup() {
            if (this.unsubscribe) {
                this.unsubscribe();
            }
        }
    }

    // Khởi tạo khi DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        // Đợi Firebase SDK load
        const checkFirebase = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                clearInterval(checkFirebase);
                
                // Tạo FirebaseManager
                if (!window.dataManager) {
                    window.dataManager = new FirebaseManager();
                    console.log('✅ FirebaseManager created');
                    
                    // Thêm nút share sau 2 giây
                    setTimeout(() => {
                        if (window.dataManager.addShareButton) {
                            window.dataManager.addShareButton();
                        }
                    }, 2000);
                }
            }
            
            // Timeout sau 10 giây
            setTimeout(() => {
                clearInterval(checkFirebase);
                if (!window.dataManager) {
                    console.warn('⚠️ Firebase timeout, using offline mode');
                    window.dataManager = new FirebaseManager();
                    window.dataManager.useOfflineMode();
                }
            }, 10000);
        }, 500);
    });

    console.log('🔥 FirebaseManager script loaded');
})();