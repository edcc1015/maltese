document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const videoSection = document.getElementById('video-section');
    const loginSection = document.getElementById('login-section');
    const letterSection = document.getElementById('letter-section');
    
    const video = document.getElementById('intro-video');
    const skipBtn = document.getElementById('skip-btn');
    const playBtn = document.getElementById('play-btn');
    
    const passwordInput = document.getElementById('password-input');
    const submitBtn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg');
    const hintBox = document.getElementById('hint-box');
    const closeHintBtn = document.getElementById('close-hint');
    
    const letterPaper = document.querySelector('.letter-paper');
    const letterText = document.getElementById('letter-text');

    // 信件内容 (从 src/letter.txt 读取)
    let letterContent = "正在加载信件...";
    
    fetch('src/letter.txt')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.text();
        })
        .then(text => {
            letterContent = text;
        })
        .catch(error => {
            console.error('Error loading letter:', error);
            letterContent = "亲爱的小白，信件加载出错了，请联系我...";
        });

    // 1. 视频播放逻辑
    
    // 兼容微信自动播放（微信浏览器特有）
    document.addEventListener("WeixinJSBridgeReady", function () {
        video.play();
    }, false);

    // 尝试自动播放
    video.muted = false; // 确保开启声音
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("带声音自动播放被阻止，等待用户交互");
            playBtn.innerHTML = "点击屏幕<br>开启惊喜";
            playBtn.classList.remove('hidden');
            
            // 只要用户点击屏幕任何地方，就开始播放
            const startPlay = () => {
                video.play();
                playBtn.classList.add('hidden');
                // 移除监听器
                document.removeEventListener('click', startPlay);
                document.removeEventListener('touchstart', startPlay);
            };
            
            document.addEventListener('click', startPlay);
            document.addEventListener('touchstart', startPlay);
        });
    }
    
    // 保留按钮点击作为双重保障
    playBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止冒泡触发上面的document监听器（虽然没坏处）
        video.play();
        playBtn.classList.add('hidden');
    });

    // 视频结束事件
    video.addEventListener('ended', showLoginSection);

    // 跳过按钮事件
    skipBtn.addEventListener('click', () => {
        video.pause();
        showLoginSection();
    });

    // 切换到登录部分
    function showLoginSection() {
        videoSection.classList.remove('active');
        loginSection.classList.add('active');
        
        // 5秒后显示提示框
        setTimeout(() => {
            hintBox.classList.remove('hidden');
            hintBox.classList.add('show');
        }, 5000);
    }

    // 关闭提示框
    closeHintBtn.addEventListener('click', () => {
        hintBox.classList.remove('show');
    });

    // 2. 密码验证逻辑
    const CORRECT_PASSWORD = "拉夫油油小白白";

    function checkPassword() {
        const input = passwordInput.value.trim();
        if (input === CORRECT_PASSWORD) {
            showLetterSection();
        } else {
            errorMsg.textContent = "密码不对哦，再想想~";
            passwordInput.value = "";
            // 简单的震动效果
            document.querySelector('.login-box').style.transform = 'translateX(10px)';
            setTimeout(() => {
                document.querySelector('.login-box').style.transform = 'translateX(-10px)';
                setTimeout(() => {
                    document.querySelector('.login-box').style.transform = 'translateX(0)';
                }, 100);
            }, 100);
        }
    }

    submitBtn.addEventListener('click', checkPassword);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkPassword();
    });

    // 3. 信件展示逻辑
    function showLetterSection() {
        loginSection.classList.remove('active');
        letterSection.classList.add('active');

        // 稍微延迟一下，让背景先渐变出来，再展开信纸
        setTimeout(() => {
            letterPaper.classList.add('open');
            // 打字机效果显示文字
            typeWriter(letterContent, letterText, 50);
        }, 800);
    }

    // 打字机效果函数
    function typeWriter(text, element, speed) {
        let i = 0;
        element.textContent = '';
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
                // 自动滚动到底部
                const paper = document.querySelector('.letter-paper');
                paper.scrollTop = paper.scrollHeight;
            }
        }
        type();
    }
});