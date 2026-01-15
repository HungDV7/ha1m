// crud-manager.js - Quản lý CRUD operations
(function () {
    'use strict';

    class CRUDManager {
        constructor() {
            console.log('🔄 CRUDManager initializing...');
            this.initialize();
        }

        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        initialize() {
            // Đợi 3 giây cho Firebase load
            setTimeout(() => {
                if (!window.dataManager) {
                    console.warn('⚠️ dataManager không tải được, dùng fallback data');
                    // Tạo dataManager giả để app chạy
                    if (!window.dataManager) {
                        window.dataManager = {
                            currentData: {
                                memories: [],
                                photos: [],
                                coupleInfo: {
                                    person1: { name: "Hung Duong" },
                                    person2: { name: "Thuy Hang" },
                                    startDate: "2026-01-01T00:00:00.000Z"
                                }
                            },
                            addMemory: function (memory) {
                                this.currentData.memories.push(memory);
                                return memory;
                            },
                            addPhoto: function (photo) {
                                this.currentData.photos.push(photo);
                                return photo;
                            }
                        };
                    }
                }

                console.log('✅ CRUDManager ready');
                this.setupEventListeners();
                this.renderMemories();
                this.renderPhotos();
            }, 3000);
        }

        // ==================== MEMORIES CRUD ====================

        showMemoryForm(memoryId = null) {
            console.log('Show memory form called with ID:', memoryId);

            let memory = null;
            if (memoryId && memoryId !== 'null' && memoryId !== 'undefined') {
                memory = window.dataManager.currentData.memories.find(m => m.id === memoryId);
                console.log('Found memory:', memory);
            }

            const safeTitle = memory ? this.escapeHtml(memory.title) : '';
            const safeContent = memory ? this.escapeHtml(memory.content) : '';
            const safeLocation = memory && memory.location ? this.escapeHtml(memory.location) : '';
            const safeTags = memory && memory.tags ? memory.tags.join(', ') : '';
            const safePhotoUrl = memory && memory.photoUrl ? this.escapeHtml(memory.photoUrl) : '';
            const safeId = memory ? this.escapeHtml(memory.id) : '';

            const modalHTML = `
        <div class="modal-overlay" id="memoryModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${memory ? 'Chỉnh sửa kỷ niệm' : 'Thêm kỷ niệm mới'}</h3>
                    <button class="close-btn" onclick="window.crudManager.closeMemoryForm()">×</button>
                </div>
                <div class="modal-body">
                    <form id="memoryForm">
                        <div class="form-group">
                            <label>Tiêu đề *</label>
                            <input type="text" id="memoryTitle" value="${safeTitle}" 
                                   placeholder="Ví dụ: Lần đầu hẹn hò" required>
                            <small class="form-hint">Tiêu đề là bắt buộc</small>
                        </div>
                        
                        <div class="form-group">
                            <label>Ngày *</label>
                            <input type="date" id="memoryDate" value="${memory ? memory.date : new Date().toISOString().split('T')[0]}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Địa điểm</label>
                            <input type="text" id="memoryLocation" value="${safeLocation}" 
                                   placeholder="Ví dụ: Quán cà phê ABC">
                        </div>
                        
                        <div class="form-group">
                            <label>Nội dung *</label>
                            <textarea id="memoryContent" rows="4" required
                                      placeholder="Kể về kỷ niệm đáng nhớ của bạn...">${safeContent}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Tags (phân cách bằng dấu phẩy)</label>
                            <input type="text" id="memoryTags" value="${safeTags}" 
                                   placeholder="first-date, movie, special">
                        </div>
                        
                        <div class="form-group">
                            <label>Chọn ảnh đại diện</label>
                            <div class="photo-preview" id="memoryPhotoPreview">
                                ${memory && memory.photoUrl ?
                    `<img src="${safePhotoUrl}" alt="Preview">` :
                    '<p class="no-photo">Chưa có ảnh</p>'}
                            </div>
                            <div class="photo-actions">
                                <button type="button" class="btn-secondary" onclick="window.crudManager.openPhotoPicker('memory')">
                                    <i class="fas fa-image"></i> Chọn ảnh
                                </button>
                            </div>
                            <input type="hidden" id="memoryPhotoUrl" value="${safePhotoUrl}">
                            <input type="hidden" id="memoryId" value="${safeId}">
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="window.crudManager.closeMemoryForm()">
                                Hủy
                            </button>
                            <button type="submit" class="btn-primary">
                                ${memory ? 'Cập nhật' : 'Thêm mới'}
                            </button>
                            ${memory ? `
                                <button type="button" class="btn-danger" onclick="window.crudManager.deleteMemory('${safeId}')">
                                    <i class="fas fa-trash"></i> Xóa
                                </button>
                            ` : ''}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            document.getElementById('memoryForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveMemory(safeId);
            });

            setTimeout(() => {
                const modal = document.getElementById('memoryModal');
                if (modal) modal.classList.add('active');
            }, 10);
        }

        closeMemoryForm() {
            const modal = document.getElementById('memoryModal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        }

        saveMemory(memoryId = null) {
            const formMemoryId = document.getElementById('memoryId')?.value || memoryId;

            // Validate required fields
            const titleInput = document.getElementById('memoryTitle');
            const contentInput = document.getElementById('memoryContent');

            if (!titleInput.value.trim()) {
                this.showNotification('Vui lòng nhập tiêu đề kỷ niệm!', 'error');
                titleInput.focus();
                return;
            }

            if (!contentInput.value.trim()) {
                this.showNotification('Vui lòng nhập nội dung kỷ niệm!', 'error');
                contentInput.focus();
                return;
            }

            const formData = {
                title: titleInput.value.trim(),
                date: document.getElementById('memoryDate').value,
                location: document.getElementById('memoryLocation').value?.trim() || '',
                content: contentInput.value.trim(),
                photoUrl: document.getElementById('memoryPhotoUrl').value?.trim() || '',
                tags: document.getElementById('memoryTags').value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag)
            };

            console.log('Saving memory with ID:', formMemoryId);
            console.log('Form data:', formData);

            if (formMemoryId && formMemoryId !== 'null' && formMemoryId !== 'undefined') {
                const success = window.dataManager.updateMemory(formMemoryId, formData);
                if (success) {
                    this.showNotification('Đã cập nhật kỷ niệm!');
                } else {
                    this.showNotification('Lỗi khi cập nhật kỷ niệm!', 'error');
                }
            } else {
                const newMemory = window.dataManager.addMemory(formData);
                this.showNotification('Đã thêm kỷ niệm mới!');
            }

            this.closeMemoryForm();
            this.renderMemories();
        }

        deleteMemory(memoryId) {
            if (!confirm('Bạn có chắc muốn xóa kỷ niệm này?')) return;

            if (window.dataManager.deleteMemory(memoryId)) {
                this.closeMemoryForm();
                this.renderMemories();
                this.showNotification('Đã xóa kỷ niệm');
            }
        }

        renderMemories() {
            const container = document.getElementById('memoriesList');
            if (!container) return;

            if (!window.dataManager || !window.dataManager.currentData) {
                console.error('Data manager not ready');
                return;
            }

            const memories = window.dataManager.currentData.memories;

            console.log('Rendering memories:', memories);
            console.log('Memory IDs:', memories.map(m => ({ id: m.id, title: m.title })));

            if (memories.length === 0) {
                container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <h4>Chưa có kỷ niệm nào</h4>
                <p>Hãy thêm kỷ niệm đầu tiên của bạn!</p>
                <button class="btn-primary" onclick="window.crudManager.showMemoryForm()">
                    <i class="fas fa-plus"></i> Thêm kỷ niệm đầu tiên
                </button>
            </div>
        `;
                return;
            }

            container.innerHTML = memories.map((memory, index) => {
                const safeId = this.escapeHtml(memory.id);
                const safeTitle = this.escapeHtml(memory.title || 'Không có tiêu đề');
                const safeContent = this.escapeHtml(memory.content || '');
                const safeLocation = memory.location ? this.escapeHtml(memory.location) : '';

                return `
            <div class="memory-item" onclick="window.crudManager.showMemoryForm('${safeId}')">
                <div class="memory-item-header">
                    <div class="memory-item-number">${index + 1}</div>
                    <div class="memory-item-title">${safeTitle}</div>
                    <button class="memory-item-edit" onclick="event.stopPropagation(); window.crudManager.showMemoryForm('${safeId}')" aria-label="Chỉnh sửa kỷ niệm">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
                <div class="memory-item-content">
                    ${safeContent}
                </div>
                <div class="memory-item-footer">
                    <span class="memory-item-date">
                        <i class="far fa-calendar"></i> ${memory.date}
                    </span>
                    ${safeLocation ? `
                        <span class="memory-item-location">
                            <i class="fas fa-map-marker-alt"></i> ${safeLocation}
                        </span>
                    ` : ''}
                    ${memory.tags && memory.tags.length > 0 ? `
                        <div class="memory-item-tags">
                            ${memory.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                ${memory.photoUrl ? `
                    <div class="memory-item-photo">
                        <img src="${memory.photoUrl}" alt="${safeTitle}" loading="lazy">
                    </div>
                ` : ''}
            </div>
        `;
            }).join('');
        }

        // ==================== PHOTOS CRUD ====================
        // (Giữ nguyên phần này như code bạn đã cung cấp, vì nó hoạt động tốt)
        openPhotoPicker(context = 'memory') {
            const modalHTML = `
                <div class="modal-overlay" id="photoPickerModal">
                    <div class="modal-content wide">
                        <div class="modal-header">
                            <h3>Chọn ảnh</h3>
                            <button class="close-btn" onclick="window.crudManager.closePhotoPicker()">×</button>
                        </div>
                        <div class="modal-body">
                            <div class="photo-picker-tabs">
                                <button class="tab-btn active" data-tab="upload">Upload ảnh</button>
                                <button class="tab-btn" data-tab="gallery">Thư viện</button>
                            </div>
                            
                            <div class="tab-content active" id="uploadTab">
                                <div class="upload-area" id="photoUploadArea">
                                    <i class="fas fa-cloud-upload-alt"></i>
                                    <p>Kéo thả ảnh vào đây hoặc click để chọn</p>
                                    <input type="file" id="photoFileInput" accept="image/*" multiple style="display: none;">
                                    <button class="btn-primary" onclick="document.getElementById('photoFileInput').click()">
                                        Chọn ảnh từ máy tính
                                    </button>
                                </div>
                            </div>
                            
                            <div class="tab-content" id="galleryTab">
                                <div class="photos-grid" id="photoGallery">
                                    <!-- Ảnh sẽ được load ở đây -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    e.target.classList.add('active');
                    document.getElementById(e.target.dataset.tab + 'Tab').classList.add('active');
                });
            });

            this.setupPhotoUpload();
            this.loadPhotoGallery();

            setTimeout(() => {
                const modal = document.getElementById('photoPickerModal');
                if (modal) modal.classList.add('active');
            }, 10);
        }

        closePhotoPicker() {
            const modal = document.getElementById('photoPickerModal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        }

        setupPhotoUpload() {
            const uploadArea = document.getElementById('photoUploadArea');
            const fileInput = document.getElementById('photoFileInput');

            if (!uploadArea || !fileInput) return;

            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                this.handlePhotoUpload(e.dataTransfer.files);
            });

            fileInput.addEventListener('change', (e) => {
                this.handlePhotoUpload(e.target.files);
            });
        }

        handlePhotoUpload(files) {
            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/')) {
                    this.showNotification('Chỉ chấp nhận file ảnh!', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    const newPhoto = {
                        url: e.target.result,
                        filename: file.name,
                        caption: '',
                        size: file.size
                    };

                    window.dataManager.addPhoto(newPhoto);
                    this.loadPhotoGallery();
                    this.showNotification(`Đã upload ảnh: ${file.name}`);

                    const memoryPhotoUrlInput = document.getElementById('memoryPhotoUrl');
                    if (memoryPhotoUrlInput) {
                        memoryPhotoUrlInput.value = e.target.result;
                        this.updateMemoryPhotoPreview(e.target.result);
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        loadPhotoGallery() {
            const gallery = document.getElementById('photoGallery');
            if (!gallery) return;

            const photos = window.dataManager.currentData.photos;

            if (photos.length === 0) {
                gallery.innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-images"></i>
                <p>Chưa có ảnh nào</p>
            </div>
        `;
                return;
            }

            gallery.innerHTML = photos.map(photo => {
                const safeCaption = this.escapeHtml(photo.caption || 'Ảnh');
                const safeUrl = this.escapeHtml(photo.url);
                const safeId = this.escapeHtml(photo.id);

                return `
            <div class="gallery-photo-item" onclick="window.crudManager.selectPhoto('${safeUrl}')">
                <img src="${photo.url}" alt="${safeCaption}" loading="lazy">
                <div class="gallery-photo-actions">
                    <button class="btn-small" onclick="event.stopPropagation(); window.crudManager.editPhoto('${safeId}')" aria-label="Sửa mô tả ảnh">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-small btn-danger" onclick="event.stopPropagation(); window.crudManager.deletePhoto('${safeId}')" aria-label="Xóa ảnh">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
            }).join('');
        }

        selectPhoto(photoUrl) {
            const memoryPhotoUrlInput = document.getElementById('memoryPhotoUrl');
            if (memoryPhotoUrlInput) {
                memoryPhotoUrlInput.value = photoUrl;
                this.updateMemoryPhotoPreview(photoUrl);
            }
            this.closePhotoPicker();
            this.showNotification('Đã chọn ảnh');
        }

        updateMemoryPhotoPreview(photoUrl) {
            const preview = document.getElementById('memoryPhotoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${photoUrl}" alt="Preview">`;
            }
        }

        editPhoto(photoId) {
            const photo = window.dataManager.currentData.photos.find(p => p.id === photoId);
            if (!photo) return;

            const caption = prompt('Nhập mô tả cho ảnh:', photo.caption || '');
            if (caption !== null) {
                window.dataManager.updatePhoto(photoId, { caption });
                this.loadPhotoGallery();
                this.renderPhotos();
                this.showNotification('Đã cập nhật mô tả ảnh');
            }
        }

        deletePhoto(photoId) {
            if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;

            if (window.dataManager.deletePhoto(photoId)) {
                this.loadPhotoGallery();
                this.renderPhotos();
                this.showNotification('Đã xóa ảnh');
            }
        }

        // crud-manager.js - CẬP NHẬT hàm renderPhotos()

        renderPhotos() {
            try {
                const container = document.getElementById('photoGrid');
                if (!container) {
                    console.error('❌ Không tìm thấy #photoGrid trong crud-manager');
                    return;
                }

                if (!window.dataManager || !window.dataManager.currentData) {
                    console.error('❌ Data manager not ready in crud-manager');
                    container.innerHTML = `
                <div class="empty-photos">
                    <i class="fas fa-camera"></i>
                    <h4>Chưa có ảnh nào</h4>
                    <p>Đang tải dữ liệu...</p>
                </div>
            `;
                    return;
                }

                const photos = window.dataManager.currentData.photos;
                console.log(`📸 CRUD Manager: Rendering ${photos.length} photos`);

                if (photos.length === 0) {
                    container.innerHTML = `
                <div class="empty-photos">
                    <i class="fas fa-camera"></i>
                    <h4>Chưa có ảnh nào</h4>
                    <p>Hãy thêm ảnh đầu tiên của bạn!</p>
                    <button class="btn-primary" id="addFirstPhotoBtn" aria-label="Thêm ảnh đầu tiên">
                        <i class="fas fa-plus"></i> Thêm ảnh đầu tiên
                    </button>
                </div>
            `;

                    setTimeout(() => {
                        const btn = document.getElementById('addFirstPhotoBtn');
                        if (btn) {
                            btn.addEventListener('click', () => this.openPhotoPicker());
                        }
                    }, 100);
                    return;
                }

                // Xóa content cũ
                container.innerHTML = '';

                // Tạo từng photo item với event listeners đầy đủ
                photos.forEach((photo, index) => {
                    const photoItem = document.createElement('div');
                    photoItem.className = 'photo-item';
                    photoItem.dataset.photoId = photo.id;
                    photoItem.dataset.photoIndex = index;

                    // Đảm bảo escape HTML để tránh XSS
                    const safeCaption = this.escapeHtml(photo.caption || 'Ảnh kỷ niệm');
                    const safeId = this.escapeHtml(photo.id);

                    // Tạo HTML với nút sửa/xóa cho TẤT CẢ ảnh
                    photoItem.innerHTML = `
                <img src="${photo.url}" alt="${safeCaption}" loading="lazy">
                <div class="photo-overlay">
                    <div class="photo-actions">
                        <button class="photo-action-btn edit-btn" 
                                aria-label="Sửa mô tả ảnh"
                                title="Sửa mô tả">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="photo-action-btn delete-btn" 
                                aria-label="Xóa ảnh"
                                title="Xóa ảnh">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="photo-action-btn view-btn" 
                                aria-label="Xem ảnh lớn"
                                title="Xem ảnh lớn">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
                ${photo.caption ? `<div class="photo-caption">${safeCaption}</div>` : ''}
            `;

                    // Thêm event listener cho toàn bộ photo item để xem ảnh lớn
                    photoItem.addEventListener('click', (e) => {
                        // Chỉ mở viewer nếu click không phải vào nút action
                        if (!e.target.closest('.photo-action-btn')) {
                            this.openPhotoViewer(photo.id);
                        }
                    });

                    // Nút edit
                    const editBtn = photoItem.querySelector('.edit-btn');
                    if (editBtn) {
                        editBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.editPhoto(photo.id);
                        });
                    }

                    // Nút delete
                    const deleteBtn = photoItem.querySelector('.delete-btn');
                    if (deleteBtn) {
                        deleteBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.deletePhoto(photo.id);
                        });
                    }

                    // Nút view
                    const viewBtn = photoItem.querySelector('.view-btn');
                    if (viewBtn) {
                        viewBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.openPhotoViewer(photo.id);
                        });
                    }

                    container.appendChild(photoItem);
                });

                console.log(`✅ CRUD Manager: Đã render ${photos.length} ảnh với nút sửa/xóa`);

            } catch (error) {
                console.error('❌ Lỗi trong renderPhotos của crud-manager:', error);
                const container = document.getElementById('photoGrid');
                if (container) {
                    container.innerHTML = `
                <div class="photo-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Có lỗi khi tải ảnh</p>
                    <button class="btn-primary" onclick="window.crudManager.renderPhotos()">
                        <i class="fas fa-redo"></i> Thử lạii
                    </button>
                </div>
            `;
                }
            }
        }

        openPhotoViewer(photoId) {
            const photo = window.dataManager.currentData.photos.find(p => p.id === photoId);
            if (!photo) return;

            const modalHTML = `
                <div class="modal-overlay" id="photoViewerModal">
                    <div class="modal-content fullscreen">
                        <div class="photo-viewer-header">
                            <button class="close-btn" onclick="window.crudManager.closePhotoViewer()">×</button>
                        </div>
                        <div class="photo-viewer-body">
                            <img src="${photo.url}" alt="${photo.caption || 'Ảnh'}" loading="lazy">
                            ${photo.caption ? `
                                <div class="photo-caption">
                                    <p>${this.escapeHtml(photo.caption)}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="photo-viewer-footer">
                            <div class="photo-viewer-actions">
                                <button class="btn-secondary" onclick="window.crudManager.editPhoto('${photo.id}')">
                                    <i class="fas fa-edit"></i> Sửa mô tả
                                </button>
                                <button class="btn-secondary" onclick="window.crudManager.downloadPhoto('${photo.url}', '${photo.filename || 'photo.jpg'}')">
                                    <i class="fas fa-download"></i> Tải xuống
                                </button>
                                <button class="btn-danger" onclick="window.crudManager.deletePhoto('${photo.id}')">
                                    <i class="fas fa-trash"></i> Xóa ảnh
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            setTimeout(() => {
                const modal = document.getElementById('photoViewerModal');
                if (modal) modal.classList.add('active');
            }, 10);
        }

        closePhotoViewer() {
            const modal = document.getElementById('photoViewerModal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        }

        downloadPhoto(dataUrl, filename) {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showNotification(`Đã tải xuống: ${filename}`);
        }

        // ==================== UTILITIES ====================

        setupEventListeners() {
            const addMemoryBtn = document.getElementById('addMemoryBtn');
            if (addMemoryBtn) {
                addMemoryBtn.addEventListener('click', () => this.showMemoryForm());
            }

            const addPhotoBtn = document.getElementById('addPhotoBtn');
            if (addPhotoBtn) {
                addPhotoBtn.addEventListener('click', () => this.openPhotoPicker());
            }

            document.addEventListener('memoryAdded', () => this.renderMemories());
            document.addEventListener('memoryUpdated', () => this.renderMemories());
            document.addEventListener('memoryDeleted', () => this.renderMemories());
            document.addEventListener('photoAdded', () => this.renderPhotos());
            document.addEventListener('photoUpdated', () => this.renderPhotos());
            document.addEventListener('photoDeleted', () => this.renderPhotos());
        }

        showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.classList.add('show');
            }, 10);

            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(() => {
            if (!window.crudManager) {
                window.crudManager = new CRUDManager();
                console.log('✅ CRUDManager created');
            }
        }, 500);
    });

    console.log('🔄 CRUDManager script loaded');
})();