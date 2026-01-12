// script.js - Trang web kỷ niệm 1 tháng yêu nhau (ĐÃ SỬA LỖI HOÀN TOÀN)

// ==================== GLOBAL VARIABLES ====================
let isMusicPlaying = false;
let audioInstance = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('💖 Love Anniversary App đang khởi động...');
    
    // Cập nhật năm hiện tại ngay lập tức
    updateCurrentYear();
    
    // Chờ dataManager sẵn sàng
    const waitForDataManager = setInterval(() => {
        if (window.dataManager && window.dataManager.currentData) {
            clearInterval(waitForDataManager);
            console.log('✅ dataManager đã sẵn sàng');
            startApp();
        }
        
        // Timeout sau 3 giây nếu dataManager không load
        setTimeout(() => {
            if (window.dataManager) return;
            clearInterval(waitForDataManager);
            console.warn('⚠️ dataManager không tải được, sử dụng dữ liệu mặc định');
            startApp();
        }, 3000);
    }, 100);
    
    function startApp() {
        try {
            console.log('🚀 Bắt đầu khởi động app...');
            
            // Khởi tạo audio
            initializeAudio();
            
            // Cập nhật thông tin cặp đôi
            updateCoupleNames();
            
            // Khởi tạo bộ đếm ngược
            initCountdown();
            
            // Tạo trái tim bay
            createFloatingHearts();
            
            // Tạo album ảnh từ dataManager - ĐÃ SỬA
            renderPhotosFromData();
            
            // Tải kỷ niệm mẫu (nếu chưa có)
            loadMemoriesIfEmpty();
            
            // Cập nhật thông điệp theo thời gian trong ngày
            updateGreeting();
            
            // Thêm sự kiện cho modal ảnh
            setupPhotoModal();
            
            // Thiết lập event listeners
            setupEventListeners();
            
            console.log('✅ App đã khởi động thành công!');
            
            // Hiển thị thông báo chào mừng
            setTimeout(() => {
                showMessage('Chào mừng đến với trang kỷ niệm tình yêu! 💝', 'success');
            }, 1000);
            
        } catch (error) {
            console.error('❌ Lỗi khi khởi động app:', error);
            showMessage('Có lỗi xảy ra khi khởi động ứng dụng', 'error');
        }
    }
});

// ==================== AUDIO FUNCTIONS ====================

function initializeAudio() {
    try {
        audioInstance = document.getElementById('backgroundMusic');
        if (!audioInstance) {
            console.error('❌ Không tìm thấy audio element');
            return;
        }
        
        audioInstance.volume = 0.3; // Âm lượng thấp hơn
        audioInstance.muted = false;
        
        // Xử lý lỗi autoplay policy của trình duyệt
        audioInstance.addEventListener('play', () => {
            isMusicPlaying = true;
            console.log('🎵 Nhạc đang phát');
        });
        
        audioInstance.addEventListener('pause', () => {
            isMusicPlaying = false;
            console.log('⏸️ Nhạc đã tạm dừng');
        });
        
        audioInstance.addEventListener('error', (e) => {
            console.error('❌ Lỗi audio:', e);
            isMusicPlaying = false;
            showMessage('Không thể phát nhạc, vui lòng thử lại', 'error');
        });
        
    } catch (error) {
        console.error('❌ Lỗi khi khởi tạo audio:', error);
    }
}

// ĐÃ SỬA LỖI: Hàm playMusic mới tránh lỗi "play() request was interrupted"
function playMusic() {
    try {
        if (!audioInstance) {
            audioInstance = document.getElementById('backgroundMusic');
            if (!audioInstance) {
                showMessage('Không tìm thấy file nhạc', 'error');
                return;
            }
        }
        
        const button = event?.target || document.querySelector('.love-button[onclick*="playMusic"]');
        
        if (isMusicPlaying) {
            // Nếu đang phát thì pause
            audioInstance.pause();
            isMusicPlaying = false;
            showMessage('Nhạc nền đã tạm dừng', 'info');
            if (button) {
                button.innerHTML = '<i class="fas fa-music"></i> Bật nhạc';
            }
        } else {
            // Nếu chưa phát thì play với promise
            const playPromise = audioInstance.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        isMusicPlaying = true;
                        console.log('✅ Phát nhạc thành công');
                        showMessage('Nhạc nền đang phát... 🎵', 'success');
                        if (button) {
                            button.innerHTML = '<i class="fas fa-pause"></i> Tạm dừng nhạc';
                        }
                    })
                    .catch(error => {
                        console.error('❌ Lỗi khi phát nhạc:', error);
                        isMusicPlaying = false;
                        
                        // Xử lý lỗi autoplay policy
                        if (error.name === 'NotAllowedError') {
                            showMessage('Vui lòng tương tác với trang trước khi phát nhạc', 'warning');
                            
                            // Khi user click bất kỳ đâu trên trang, enable audio
                            const enableAudio = () => {
                                audioInstance.play()
                                    .then(() => {
                                        console.log('✅ Đã enable audio sau user interaction');
                                        isMusicPlaying = true;
                                        if (button) {
                                            button.innerHTML = '<i class="fas fa-pause"></i> Tạm dừng nhạc';
                                        }
                                    })
                                    .catch(() => {});
                                document.removeEventListener('click', enableAudio);
                            };
                            
                            document.addEventListener('click', enableAudio, { once: true });
                        }
                    });
            }
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi phát nhạc:', error);
        showMessage('Có lỗi xảy ra khi phát nhạc', 'error');
    }
}

// ==================== PHOTO FUNCTIONS (ĐÃ SỬA HOÀN TOÀN) ====================

// HÀM MỚI: Render ảnh từ dataManager với nút sửa/xóa đầy đủ
function renderPhotosFromData() {
    try {
        const photoGrid = document.getElementById('photoGrid');
        if (!photoGrid) {
            console.error('❌ Không tìm thấy #photoGrid');
            return;
        }
        
        // Lấy photos từ dataManager
        let photos = [];
        if (window.dataManager && window.dataManager.currentData) {
            photos = window.dataManager.currentData.photos;
            console.log(`📸 Loaded ${photos.length} photos from dataManager`);
        }
        
        // Nếu không có photos, sử dụng mẫu
        if (photos.length === 0) {
            console.log('📸 Using sample photos');
            photos = getSamplePhotos();
        }
        
        // Xóa nội dung cũ
        photoGrid.innerHTML = '';
        
        // Tạo từng photo item
        photos.forEach((photo, index) => {
            const photoItem = createPhotoElement(photo, index);
            photoGrid.appendChild(photoItem);
        });
        
        console.log(`✅ Đã render ${photos.length} ảnh với nút sửa/xóa`);
        
    } catch (error) {
        console.error('❌ Lỗi khi render photos:', error);
        showErrorState('photoGrid', 'Không thể tải album ảnh');
    }
}

// HÀM MỚI: Tạo element cho mỗi ảnh
function createPhotoElement(photo, index) {
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    photoItem.dataset.photoId = photo.id || `photo-${index}`;
    
    const caption = photo.caption || 'Ảnh kỷ niệm';
    const safeCaption = escapeHtml(caption);
    const safeUrl = escapeHtml(photo.url);
    
    // Tạo HTML với nút sửa/xóa CHO TẤT CẢ ẢNH
    photoItem.innerHTML = `
        <img src="${photo.url}" alt="${caption}" loading="lazy" 
             onerror="this.src='https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'">
        
        <!-- Photo overlay với nút action -->
        <div class="photo-overlay">
            <div class="photo-actions">
                <button class="photo-action-btn edit-btn" title="Sửa mô tả">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="photo-action-btn delete-btn" title="Xóa ảnh">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="photo-action-btn view-btn" title="Xem ảnh lớn">
                    <i class="fas fa-expand"></i>
                </button>
            </div>
        </div>
        
        <!-- Caption (ẩn khi hover) -->
        <div class="photo-caption">${safeCaption}</div>
    `;
    
    // Thêm event listeners
    setupPhotoEventListeners(photoItem, photo, index);
    
    return photoItem;
}

// HÀM MỚI: Thiết lập event listeners cho ảnh
function setupPhotoEventListeners(photoItem, photo, index) {
    const photoId = photo.id || index;
    
    // Click toàn bộ ảnh để xem lớn
    photoItem.addEventListener('click', (e) => {
        // Không trigger nếu click vào nút action
        if (!e.target.closest('.photo-action-btn')) {
            openPhotoModal(photo.url, photo.caption || 'Ảnh kỷ niệm');
        }
    });
    
    // Nút xem ảnh lớn
    const viewBtn = photoItem.querySelector('.view-btn');
    if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPhotoModal(photo.url, photo.caption || 'Ảnh kỷ niệm');
        });
    }
    
    // Nút sửa
    const editBtn = photoItem.querySelector('.edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editPhotoPrompt(photoId, photo.caption);
        });
    }
    
    // Nút xóa
    const deleteBtn = photoItem.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePhotoPrompt(photoId, photo.caption || 'Ảnh');
        });
    }
}

// HÀM MỚI: Hiển thị prompt để sửa ảnh
function editPhotoPrompt(photoId, currentCaption) {
    const newCaption = prompt('Nhập mô tả mới cho ảnh:', currentCaption || '');
    if (newCaption !== null && window.dataManager) {
        window.dataManager.updatePhoto(photoId, { caption: newCaption });
        renderPhotosFromData(); // Re-render
        showMessage('Đã cập nhật mô tả ảnh', 'success');
    }
}

// HÀM MỚI: Hiển thị confirm để xóa ảnh
function deletePhotoPrompt(photoId, photoName) {
    if (confirm(`Bạn có chắc muốn xóa ảnh "${photoName}"?`)) {
        if (window.dataManager && window.dataManager.deletePhoto(photoId)) {
            renderPhotosFromData(); // Re-render
            showMessage('Đã xóa ảnh', 'success');
        } else {
            showMessage('Không thể xóa ảnh', 'error');
        }
    }
}

// HÀM MỚI: Lấy ảnh mẫu
function getSamplePhotos() {
    return [
        {
            id: 'sample-1',
            url: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
            caption: 'Khoảnh khắc đầu tiên',
            date: new Date().toISOString()
        },
        {
            id: 'sample-2',
            url: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
            caption: 'Ngày hạnh phúc',
            date: new Date().toISOString()
        },
        {
            id: 'sample-3',
            url: 'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=40',
            caption: 'Nụ cười tỏa nắng',
            date: new Date().toISOString()
        }
    ];
}

// ==================== CORE FUNCTIONS ====================

// Cập nhật tên cặp đôi
function updateCoupleNames() {
    try {
        const nameElements = document.querySelectorAll('.couple-names .name');
        if (nameElements.length >= 2) {
            let person1 = '[Tên bạn]';
            let person2 = '[Tên người yêu]';
            
            if (window.dataManager && window.dataManager.currentData) {
                const coupleInfo = window.dataManager.currentData.coupleInfo;
                person1 = coupleInfo.person1.name || person1;
                person2 = coupleInfo.person2.name || person2;
            }
            
            nameElements[0].textContent = person1;
            nameElements[1].textContent = person2;
            
            document.title = `Kỷ niệm tình yêu - ${person1} ❤️ ${person2}`;
        }
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật tên cặp đôi:', error);
    }
}

// Cập nhật năm hiện tại
function updateCurrentYear() {
    try {
        const currentYearElement = document.getElementById('currentYear');
        if (currentYearElement) {
            currentYearElement.textContent = new Date().getFullYear();
        }
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật năm:', error);
    }
}

// Bộ đếm ngược
function initCountdown() {
    try {
        const countdownDateElement = document.getElementById('countdownDate');
        
        let startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        if (window.dataManager && window.dataManager.currentData) {
            const savedDate = window.dataManager.currentData.coupleInfo.startDate;
            if (savedDate) {
                startDate = new Date(savedDate);
            }
        }
        
        const startDateStr = startDate.toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        if (countdownDateElement) {
            countdownDateElement.textContent = `Bắt đầu từ: ${startDateStr}`;
        }
        
        updateCountdown(startDate);
        setInterval(() => updateCountdown(startDate), 1000);
        
    } catch (error) {
        console.error('❌ Lỗi khi khởi tạo bộ đếm ngược:', error);
    }
}

function updateCountdown(startDate) {
    try {
        const now = new Date();
        const diff = now - startDate;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const daysElement = document.getElementById('days');
        const hoursElement = document.getElementById('hours');
        const minutesElement = document.getElementById('minutes');
        const secondsElement = document.getElementById('seconds');
        
        if (daysElement) daysElement.textContent = days;
        if (hoursElement) hoursElement.textContent = hours.toString().padStart(2, '0');
        if (minutesElement) minutesElement.textContent = minutes.toString().padStart(2, '0');
        if (secondsElement) secondsElement.textContent = seconds.toString().padStart(2, '0');
        
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật bộ đếm ngược:', error);
    }
}

// Tạo trái tim bay
function createFloatingHearts() {
    try {
        const heartsContainer = document.getElementById('floatingHearts');
        if (!heartsContainer) return;
        
        heartsContainer.innerHTML = '';
        
        for (let i = 0; i < 20; i++) {
            createSingleHeart(heartsContainer, i);
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi tạo trái tim bay:', error);
    }
}

function createSingleHeart(container, index) {
    const heart = document.createElement('div');
    heart.classList.add('heart-particle');
    heart.innerHTML = '♥';
    
    const size = Math.random() * 20 + 10;
    heart.style.fontSize = `${size}px`;
    
    const startLeft = Math.random() * 100;
    heart.style.left = `${startLeft}%`;
    
    const duration = Math.random() * 4 + 4;
    heart.style.animationDuration = `${duration}s`;
    
    const delay = Math.random() * 5;
    heart.style.animationDelay = `${delay}s`;
    
    const colors = ['#ff4d6d', '#ff8fab', '#ffacc7', '#ff6b9d'];
    heart.style.color = colors[Math.floor(Math.random() * colors.length)];
    
    container.appendChild(heart);
    
    setTimeout(() => {
        if (heart.parentNode === container) {
            container.removeChild(heart);
            setTimeout(() => createSingleHeart(container, index), Math.random() * 3000);
        }
    }, (duration + delay) * 1000);
}

// Tải memories nếu empty
function loadMemoriesIfEmpty() {
    try {
        if (!window.dataManager) return;
        
        const memories = window.dataManager.currentData.memories;
        if (memories.length === 0) {
            const sampleMemories = [
                {
                    title: "Ngày đầu tiên gặp nhau",
                    content: "Khoảnh khắc đầu tiên nhìn thấy nhau, tim tôi như ngừng đập...",
                    date: new Date().toISOString().split('T')[0],
                    location: "Quán cà phê ABC",
                    tags: ["first-meet", "special"]
                },
                {
                    title: "Lần đầu hẹn hò",
                    content: "Chúng ta đã nói chuyện suốt 3 tiếng mà không biết chán!",
                    date: new Date().toISOString().split('T')[0],
                    location: "Rạp chiếu phim XYZ",
                    tags: ["first-date", "movie"]
                }
            ];
            
            sampleMemories.forEach(memory => {
                window.dataManager.addMemory(memory);
            });
            
            console.log('✅ Đã thêm kỷ niệm mẫu');
        }
    } catch (error) {
        console.error('❌ Lỗi khi tải memories:', error);
    }
}

// Cập nhật lời chào theo thời gian
function updateGreeting() {
    try {
        // Bỏ phần greeting vì không có phần tử loveMessage
        console.log('ℹ️ Bỏ qua updateGreeting vì không có loveMessage element');
        
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật greeting:', error);
    }
}

// Modal xem ảnh
function setupPhotoModal() {
    try {
        if (!document.getElementById('photoModal')) {
            const modal = document.createElement('div');
            modal.id = 'photoModal';
            modal.className = 'photo-modal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.9);
                z-index: 1000;
                justify-content: center;
                align-items: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            
            modal.innerHTML = `
                <span class="close-modal" style="
                    position: absolute;
                    top: 20px;
                    right: 30px;
                    color: white;
                    font-size: 40px;
                    cursor: pointer;
                    z-index: 1001;
                ">&times;</span>
                <div class="photo-modal-content" style="
                    max-width: 90%;
                    max-height: 90%;
                    text-align: center;
                ">
                    <img id="modalImage" src="" alt="" style="
                        max-width: 100%;
                        max-height: 80vh;
                        border-radius: 10px;
                        box-shadow: 0 5px 25px rgba(0,0,0,0.5);
                    ">
                    <div id="modalCaption" style="
                        color: white;
                        font-size: 1.2em;
                        margin-top: 20px;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 5px;
                        max-width: 600px;
                        margin-left: auto;
                        margin-right: auto;
                    "></div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.close-modal').addEventListener('click', closePhotoModal);
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closePhotoModal();
            });
            
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') closePhotoModal();
            });
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi thiết lập photo modal:', error);
    }
}

function openPhotoModal(imageSrc, caption) {
    try {
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('modalImage');
        const modalCaption = document.getElementById('modalCaption');
        
        if (!modal || !modalImage || !modalCaption) return;
        
        modalImage.src = imageSrc;
        modalImage.alt = caption || 'Ảnh kỷ niệm';
        modalCaption.textContent = caption || '';
        
        modal.style.display = 'flex';
        setTimeout(() => modal.style.opacity = '1', 10);
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('❌ Lỗi khi mở photo modal:', error);
    }
}

function closePhotoModal() {
    try {
        const modal = document.getElementById('photoModal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }, 300);
        }
    } catch (error) {
        console.error('❌ Lỗi khi đóng photo modal:', error);
    }
}

// ==================== INTERACTIVE FUNCTIONS ====================

function showLove() {
    try {
        const loveMessages = [
            "Anh yêu em nhiều lắm! 💖",
            "Chúng ta sẽ mãi mãi bên nhau nhé!",
            "Yêu em hơn mọi thứ trên đời!"
        ];
        
        const randomMessage = loveMessages[Math.floor(Math.random() * loveMessages.length)];
        
        const messageDisplay = document.getElementById('loveMessageDisplay');
        if (messageDisplay) {
            messageDisplay.textContent = randomMessage;
            messageDisplay.style.opacity = '1';
            messageDisplay.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                messageDisplay.style.opacity = '0';
            }, 5000);
        }
        
        createSpecialHearts(10);
        
    } catch (error) {
        console.error('❌ Lỗi khi hiển thị tình yêu:', error);
    }
}

function createSpecialHearts(count) {
    try {
        const heartsContainer = document.getElementById('floatingHearts');
        if (!heartsContainer) return;
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const heart = document.createElement('div');
                heart.classList.add('heart-particle', 'special-heart');
                heart.innerHTML = '♥';
                
                const size = Math.random() * 25 + 15;
                heart.style.fontSize = `${size}px`;
                
                const startLeft = Math.random() * 100;
                heart.style.left = `${startLeft}%`;
                
                const duration = Math.random() * 2 + 1;
                heart.style.animationDuration = `${duration}s`;
                
                const colors = ['#ff4d6d', '#ff3366', '#ff0066'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                heart.style.color = randomColor;
                heart.style.textShadow = `0 0 10px ${randomColor}`;
                
                heartsContainer.appendChild(heart);
                
                setTimeout(() => {
                    if (heart.parentNode === heartsContainer) {
                        heartsContainer.removeChild(heart);
                    }
                }, duration * 1000);
                
            }, i * 100);
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi tạo trái tim đặc biệt:', error);
    }
}

// Đổi giao diện
function changeTheme() {
    try {
        const body = document.body;
        const button = event?.target || document.querySelector('.love-button[onclick*="changeTheme"]');
        
        body.classList.toggle('dark-theme');
        
        if (body.classList.contains('dark-theme')) {
            showMessage('Đã chuyển sang giao diện tối 🌙', 'success');
            if (button) button.innerHTML = '<i class="fas fa-sun"></i> Giao diện sáng';
            localStorage.setItem('loveTheme', 'dark');
        } else {
            showMessage('Đã chuyển sang giao diện sáng ☀️', 'success');
            if (button) button.innerHTML = '<i class="fas fa-palette"></i> Đổi nền';
            localStorage.setItem('loveTheme', 'light');
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi đổi giao diện:', error);
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Hiển thị thông báo
function showMessage(message, type = 'info') {
    try {
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) oldNotification.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'warning') icon = 'fa-exclamation-triangle';
        
        notification.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            max-width: 350px;
        `;
        
        if (type === 'success') notification.style.backgroundColor = '#4CAF50';
        else if (type === 'error') notification.style.backgroundColor = '#f44336';
        else if (type === 'warning') notification.style.backgroundColor = '#ff9800';
        else notification.style.backgroundColor = '#2196F3';
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.style.transform = 'translateX(0)', 10);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
    } catch (error) {
        console.error('❌ Lỗi khi hiển thị thông báo:', error);
    }
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Hiển thị trạng thái lỗi
function showErrorState(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="photo-error">
                <i class="fas fa-heart-broken"></i>
                <p>${message}</p>
                <button class="btn-primary" onclick="renderPhotosFromData()">
                    <i class="fas fa-redo"></i> Thử lại
                </button>
            </div>
        `;
    }
}

// Thiết lập event listeners
function setupEventListeners() {
    try {
        // Theme từ localStorage
        if (localStorage.getItem('loveTheme') === 'dark') {
            document.body.classList.add('dark-theme');
        }
        
        // Lắng nghe sự kiện từ dataManager để re-render ảnh
        if (window.dataManager) {
            ['photoAdded', 'photoUpdated', 'photoDeleted'].forEach(eventName => {
                document.addEventListener(eventName, () => {
                    console.log(`📸 ${eventName} event received, re-rendering photos`);
                    renderPhotosFromData();
                });
            });
        }
        
    } catch (error) {
        console.error('❌ Lỗi khi thiết lập event listeners:', error);
    }
}

// Log version
console.log('💖 Love Anniversary App v2.2 - Đã sửa hoàn toàn lỗi audio và photos');