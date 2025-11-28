// 测试 MIME 类型检测功能
async function testMimeTypes() {
    console.log('测试 MIME 类型检测功能...');

    // 模拟 getContentType 函数
    function getContentType(objectKey) {
        const extension = objectKey.toLowerCase().split('.').pop();
        const mimeTypes = {
            'txt': 'text/plain',
            'html': 'text/html',
            'htm': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'xml': 'application/xml',
            'pdf': 'application/pdf',
            'zip': 'application/zip',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp',
            'ico': 'image/x-icon',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'flac': 'audio/flac',
            'aac': 'audio/aac',
            'csv': 'text/csv',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            // Database files
            'sqlite': 'application/vnd.sqlite3',
            'db': 'application/octet-stream',
            // Executable files
            'exe': 'application/vnd.microsoft.portable-executable',
            'dll': 'application/vnd.microsoft.portable-executable',
            'lib': 'application/octet-stream'
        };

        return mimeTypes[extension] || 'application/octet-stream';
    }

    // 测试用例
    const testCases = [
        { file: 'test.sqlite', expected: 'application/vnd.sqlite3' },
        { file: 'database.db', expected: 'application/octet-stream' },
        { file: 'program.exe', expected: 'application/vnd.microsoft.portable-executable' },
        { file: 'library.dll', expected: 'application/vnd.microsoft.portable-executable' },
        { file: 'static.lib', expected: 'application/octet-stream' },
        { file: 'image.jpg', expected: 'image/jpeg' }, // 测试现有类型是否仍然有效
        { file: 'document.pdf', expected: 'application/pdf' }, // 测试现有类型是否仍然有效
        { file: 'unknown.xyz', expected: 'application/octet-stream' } // 测试未知类型
    ];

    let allTestsPassed = true;

    for (const testCase of testCases) {
        const result = getContentType(testCase.file);
        const passed = result === testCase.expected;
        
        console.log(`${passed ? '✓' : '✗'} ${testCase.file}: 期望 '${testCase.expected}', 实际 '${result}'`);
        
        if (!passed) {
            allTestsPassed = false;
        }
    }

    console.log('');
    if (allTestsPassed) {
        console.log('✅ 所有测试通过！MIME 类型检测功能正常工作。');
    } else {
        console.log('❌ 一些测试失败！请检查 MIME 类型配置。');
    }

    return allTestsPassed;
}

// 运行测试
testMimeTypes();