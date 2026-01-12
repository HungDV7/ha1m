// data-manager.js - Quản lý dữ liệu kỷ niệm
(function() {
    'use strict';
    
    // CONFIG chỉ khai báo 1 lần ở đây
    if (!window.CONFIG) {
        window.CONFIG = {
            // Thay đổi ngày bắt đầu yêu nhau của bạn
            startDate: new Date(2026, 0, 1, 0, 0, 0), // 1/1/2026 00:00:00
            
            // Tên cặp đôi
            coupleNames: {
                person1: "Hung Duong",
                person2: "Thuy Hang"
            },
            
            // Thông điệp yêu thương
            loveMessages: [
                "Anh/Em yêu em/anh nhiều lắm! 💖",
                "Mỗi ngày bên em/anh là một ngày hạnh phúc!",
                "Cảm ơn em/anh vì đã đến bên anh/em!",
                "Chúng ta sẽ mãi mãi bên nhau nhé!",
                "Em/Anh là điều tuyệt vời nhất với anh/em!",
                "Yêu em/anh đến tận cùng vũ trụ này!",
                "Mãi mãi chỉ yêu mình em/anh thôi!",
                "Hạnh phúc nhất là được ở bên em/anh!"
            ],
            
            // Ảnh mẫu (sẽ được thay thế bằng LocalStorage)
            defaultPhotos: [
                { id: '1', url: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80', caption: 'Ngày đầu tiên' },
                { id: '2', url: 'https://images.unsplash.com/photo-1529254479751-fbacb4c7a587?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80', caption: 'Cùng nhau dạo phố' },
                { id: '3', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-4.0.3&auto=format&fit=crop&w=1169&q=80', caption: 'Những bữa ăn cùng nhau' }
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
                    startDate: CONFIG.startDate.toISOString().split('T')[0],
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
        
        // Lưu dữ liệu
        saveData() {
            try {
                this.currentData.lastUpdated = new Date().toISOString();
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentData));
                
                // Dispatch event để các component khác biết
                const event = new CustomEvent('dataSaved', { 
                    detail: { timestamp: new Date().toISOString() }
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
            this.saveData();
            
            // Dispatch event
            const event = new CustomEvent('coupleInfoUpdated');
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
        
        // Get statistics
        getStats() {
            const data = this.currentData;
            const startDate = new Date(data.coupleInfo.startDate);
            const today = new Date();
            const diffTime = Math.abs(today - startDate);
            const daysTogether = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return {
                totalMemories: data.memories.length,
                totalPhotos: data.photos.length,
                totalLoveNotes: data.loveNotes.length,
                daysTogether: daysTogether,
                lastUpdated: data.lastUpdated
            };
        }
    }
    
    // Khởi tạo và gán vào global scope
    if (!window.dataManager) {
        window.dataManager = new DataManager();
    }
    
    console.log('✅ DataManager loaded successfully');
})();