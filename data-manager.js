// data-manager.js - Quản lý dữ liệu kỷ niệm
(function() {
    'use strict';
    
    // CONFIG chỉ khai báo 1 lần ở đây
    if (!window.CONFIG) {
        window.CONFIG = {
            // Thay đổi ngày bắt đầu yêu nhau của bạn
            // CHÚ Ý: Sử dụng Date(year, monthIndex, day, hour, minute, second)
            // monthIndex: 0 = tháng 1, 11 = tháng 12
            startDate: new Date(2026, 0, 1, 0, 0, 0), // 1/1/2026 00:00:00
            
            // Tên cặp đôi
            coupleNames: {
                person1: "Hung Duong",
                person2: "Thuy Hang"
            },
            
            // Thông điệp yêu thương
            loveMessages: [
                "Anh yêu em nhiều lắm! 💖",
                "Mỗi ngày bên em là một ngày hạnh phúc!",
                "Cảm ơn em vì đã đến bên anh!",
                "Hạnh phúc nhất là được ở bên em!"
            ],
            
            // Ảnh mẫu (sẽ được thay thế bằng LocalStorage)
            defaultPhotos: [
                { id: '1', url: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80', caption: 'Ngày đầu tiên' }
            ]
        };
    }
    
    class DataManager {
        constructor() {
            this.STORAGE_KEY = 'love_anniversary_data_v2';
            this.currentData = this.loadData();
            this.setupAutoSave();
            console.log('📊 DataManager initialized');
        }
        
        // Cấu trúc dữ liệu mặc định
        getDefaultData() {
            // SỬA QUAN TRỌNG: Lưu startDate dưới dạng ISO string đầy đủ
            return {
                version: '2.0',
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
                    // SỬA: Lưu đầy đủ ISO string để tránh lỗi múi giờ
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
        
        // Tải dữ liệu từ LocalStorage
        loadData() {
            try {
                const saved = localStorage.getItem(this.STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Kiểm tra version và migrate nếu cần
                    return this.migrateData(parsed);
                }
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu:', error);
            }
            return this.getDefaultData();
        }
        
        // Migrate dữ liệu từ version cũ
        migrateData(oldData) {
            if (!oldData.version || oldData.version === '1.0') {
                // Migration từ version 1.0 lên 2.0
                const newData = this.getDefaultData();
                
                // Giữ lại memories
                if (oldData.memories) {
                    newData.memories = oldData.memories;
                }
                
                // Giữ lại photos nếu có
                if (oldData.photos && oldData.photos.length > 0) {
                    newData.photos = oldData.photos;
                }
                
                // Giữ lại coupleInfo nếu có
                if (oldData.coupleInfo) {
                    newData.coupleInfo = {
                        ...newData.coupleInfo,
                        ...oldData.coupleInfo
                    };
                    
                    // FIX: Chuyển đổi startDate nếu nó chỉ là string ngày
                    if (oldData.coupleInfo.startDate && !oldData.coupleInfo.startDate.includes('T')) {
                        // Nếu startDate chỉ là "YYYY-MM-DD", chuyển thành ISO string
                        const dateObj = new Date(oldData.coupleInfo.startDate + 'T00:00:00');
                        newData.coupleInfo.startDate = dateObj.toISOString();
                    }
                }
                
                // Giữ lại settings nếu có
                if (oldData.settings) {
                    newData.settings = {
                        ...newData.settings,
                        ...oldData.settings
                    };
                }
                
                return newData;
            }
            
            return oldData;
        }
        
        // Lấy ngày bắt đầu chính xác (hàm mới)
        getStartDate() {
            const startDateStr = this.currentData.coupleInfo.startDate;
            
            // Nếu là string ISO đầy đủ
            if (startDateStr.includes('T')) {
                return new Date(startDateStr);
            }
            // Nếu chỉ là date string "YYYY-MM-DD"
            else if (startDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Thêm thời gian và đặt múi giờ UTC để tránh sai lệch
                return new Date(startDateStr + 'T00:00:00Z');
            }
            // Fallback: dùng CONFIG
            else {
                return CONFIG.startDate;
            }
        }
        
        // Lưu dữ liệu
        saveData() {
            try {
                this.currentData.lastUpdated = new Date().toISOString();
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentData));
                
                // Dispatch event để các component khác biết
                const event = new CustomEvent('dataSaved', { 
                    detail: { 
                        timestamp: new Date().toISOString(),
                        startDate: this.currentData.coupleInfo.startDate 
                    }
                });
                document.dispatchEvent(event);
                
                return true;
            } catch (error) {
                console.error('Lỗi khi lưu dữ liệu:', error);
                return false;
            }
        }
        
        // Auto-save
        setupAutoSave() {
            let saveTimeout;
            
            // Lắng nghe thay đổi từ các form
            document.addEventListener('input', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    this.saveData();
                }, 2000);
            });
        }
        
        // Thêm kỷ niệm mới
        addMemory(memory) {
            const newMemory = {
                id: this.generateId(),
                date: new Date().toISOString().split('T')[0],
                createdDate: new Date().toISOString(),
                createdBy: 'Bạn',
                ...memory
            };
            
            this.currentData.memories.unshift(newMemory);
            this.saveData();
            
            // Dispatch event
            const event = new CustomEvent('memoryAdded', { detail: newMemory });
            document.dispatchEvent(event);
            
            return newMemory;
        }
        
        // Cập nhật kỷ niệm
        updateMemory(memoryId, updates) {
            const index = this.currentData.memories.findIndex(m => m.id === memoryId);
            if (index !== -1) {
                this.currentData.memories[index] = {
                    ...this.currentData.memories[index],
                    ...updates,
                    updatedDate: new Date().toISOString()
                };
                this.saveData();
                
                // Dispatch event
                const event = new CustomEvent('memoryUpdated', { 
                    detail: { id: memoryId, ...updates }
                });
                document.dispatchEvent(event);
                
                return true;
            }
            return false;
        }
        
        // Xóa kỷ niệm
        deleteMemory(memoryId) {
            const initialLength = this.currentData.memories.length;
            this.currentData.memories = this.currentData.memories.filter(m => m.id !== memoryId);
            
            if (this.currentData.memories.length < initialLength) {
                this.saveData();
                
                // Dispatch event
                const event = new CustomEvent('memoryDeleted', { detail: memoryId });
                document.dispatchEvent(event);
                
                return true;
            }
            return false;
        }
        
        // Thêm ảnh mới
        addPhoto(photo) {
            const newPhoto = {
                id: this.generateId(),
                uploadDate: new Date().toISOString(),
                ...photo
            };
            
            this.currentData.photos.unshift(newPhoto);
            this.saveData();
            
            // Dispatch event
            const event = new CustomEvent('photoAdded', { detail: newPhoto });
            document.dispatchEvent(event);
            
            return newPhoto;
        }
        
        // Cập nhật ảnh
        updatePhoto(photoId, updates) {
            const index = this.currentData.photos.findIndex(p => p.id === photoId);
            if (index !== -1) {
                this.currentData.photos[index] = {
                    ...this.currentData.photos[index],
                    ...updates
                };
                this.saveData();
                
                // Dispatch event
                const event = new CustomEvent('photoUpdated', { 
                    detail: { id: photoId, ...updates }
                });
                document.dispatchEvent(event);
                
                return true;
            }
            return false;
        }
        
        // Xóa ảnh
        deletePhoto(photoId) {
            const initialLength = this.currentData.photos.length;
            this.currentData.photos = this.currentData.photos.filter(p => p.id !== photoId);
            
            if (this.currentData.photos.length < initialLength) {
                this.saveData();
                
                // Dispatch event
                const event = new CustomEvent('photoDeleted', { detail: photoId });
                document.dispatchEvent(event);
                
                return true;
            }
            return false;
        }
        
        // Cập nhật thông tin cặp đôi
        updateCoupleInfo(info) {
            this.currentData.coupleInfo = {
                ...this.currentData.coupleInfo,
                ...info
            };
            
            // FIX: Nếu update startDate, đảm bảo nó là ISO string
            if (info.startDate && typeof info.startDate === 'string') {
                if (!info.startDate.includes('T')) {
                    // Chuyển đổi "YYYY-MM-DD" thành ISO string
                    const dateObj = new Date(info.startDate + 'T00:00:00');
                    this.currentData.coupleInfo.startDate = dateObj.toISOString();
                }
            }
            
            this.saveData();
            
            // Dispatch event
            const event = new CustomEvent('coupleInfoUpdated', { 
                detail: { startDate: this.currentData.coupleInfo.startDate }
            });
            document.dispatchEvent(event);
            
            return true;
        }
        
        // Export data
        exportData() {
            const dataStr = JSON.stringify(this.currentData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `kyniem-tinhyeu-${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            return exportFileDefaultName;
        }
        
        // Import data
        importData(jsonString) {
            try {
                const importedData = JSON.parse(jsonString);
                
                // Validate
                if (!importedData.memories || !importedData.coupleInfo) {
                    throw new Error('File không hợp lệ');
                }
                
                this.currentData = this.migrateData(importedData);
                this.saveData();
                
                // Dispatch event
                const event = new CustomEvent('dataImported');
                document.dispatchEvent(event);
                
                return true;
            } catch (error) {
                console.error('Lỗi import:', error);
                return false;
            }
        }
        
        // Reset data
        resetData() {
            localStorage.removeItem(this.STORAGE_KEY);
            this.currentData = this.getDefaultData();
            
            // Dispatch event
            const event = new CustomEvent('dataReset');
            document.dispatchEvent(event);
            
            return true;
        }
        
        // Tạo ID
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        
        // Get statistics - SỬA LẠI ĐỂ TRÁNH LỖI MÚI GIỜ
        getStats() {
            const data = this.currentData;
            const startDate = this.getStartDate(); // Sử dụng hàm getStartDate mới
            const today = new Date();
            
            // Tính toán số ngày chính xác
            const startUTC = Date.UTC(
                startDate.getFullYear(), 
                startDate.getMonth(), 
                startDate.getDate()
            );
            const todayUTC = Date.UTC(
                today.getFullYear(), 
                today.getMonth(), 
                today.getDate()
            );
            
            const diffTime = todayUTC - startUTC;
            const daysTogether = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
            
            return {
                totalMemories: data.memories.length,
                totalPhotos: data.photos.length,
                totalLoveNotes: data.loveNotes.length,
                daysTogether: daysTogether,
                lastUpdated: data.lastUpdated,
                // Thêm thông tin debug
                debug: {
                    startDateISO: data.coupleInfo.startDate,
                    startDateObject: startDate.toString(),
                    today: today.toString()
                }
            };
        }
    }
    
    // Khởi tạo và gán vào global scope
    if (!window.dataManager) {
        window.dataManager = new DataManager();
    }
    
    console.log('✅ DataManager loaded successfully');
    console.log('📅 Ngày bắt đầu được cấu hình:', CONFIG.startDate.toString());
    console.log('📅 Ngày bắt đầu trong dữ liệu:', window.dataManager.currentData.coupleInfo.startDate);
})();