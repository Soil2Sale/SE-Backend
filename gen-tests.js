const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const testDir = path.join(srcDir, '__tests__');

if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

function getFiles(dir, files_) {
    files_ = files_ || [];
    const files = fs.readdirSync(dir);
    for (var i in files) {
        const name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()) {
            if (!name.includes('__tests__') && !name.includes('__mocks__')) {
                getFiles(name, files_);
            }
        } else {
            if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.includes('__tests__')) {
                files_.push(name);
            }
        }
    }
    return files_;
}

const allTsFiles = getFiles(srcDir);

allTsFiles.forEach(file => {
    // e.g. /home/raghav/SE-Backend/src/controllers/auth.ts
    const relPath = path.relative(srcDir, file);
    // RelPath: controllers/auth.ts
    const testFileName = relPath.replace(/\.ts$/, '.unit.test.ts');
    const fullTestPath = path.join(testDir, testFileName);

    const parsedRelPath = path.parse(relPath);
    const testSubDir = path.join(testDir, parsedRelPath.dir);

    if (!fs.existsSync(testSubDir)) {
        fs.mkdirSync(testSubDir, { recursive: true });
    }

    // Only create if not exists
    if (!fs.existsSync(fullTestPath)) {
        // Relative path out from testSubDir to module
        // E.g. testSubDir is src/__tests__/controllers
        // module is src/controllers/auth.ts
        // We need to require('../../controllers/auth')
        const depth = parsedRelPath.dir ? parsedRelPath.dir.split('/').length + 1 : 1;
        let upDir = '../'.repeat(depth);
        const importPath = upDir + relPath.replace(/\.ts$/, '');

        // For routes, just basic test, for controllers basic test.
        let content = `import * as mod from '${importPath}';

describe('${relPath}', () => {
  it('should be defined', () => {
    expect(mod).toBeDefined();
  });
});
`;

        // Only generate if it's in controllers, models, routes or middlewares
        if (parsedRelPath.dir.match(/controllers|models|routes|middlewares/)) {
            fs.writeFileSync(fullTestPath, content);
            console.log("Created test for", relPath);
        }
    }
});

console.log('Done generating backend tests.');
