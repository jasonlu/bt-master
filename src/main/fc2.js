const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const invalidFilenamePattern = /[<>:"/\\|?*\x00-\x1F]/g;
const titleNotFound = 'お探しの商品が見つかりません';


// Function to read files in a folder
async function readFolder(folderPath) {
  try {
    const files = await fs.promises.readdir(folderPath);
    return files;
  } catch (error) {
    console.error('Error reading folder:', error);
    return [];
  }
}

// Function to get title from webpage
async function getTitleFromUrl(url) {
  try {
    const options = {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    }
    const response = await axios.get(url, options);
    // console.log(response)
    //console.log(url, response.status)
    const $ = cheerio.load(response.data);
    const title = $('title').text();
    // console.log(title)
    return title;
  } catch (error) {
    const status = error.response?.status
    console.error('Error fetching title from URL:', status);
    return null;
  }
}

// Function to rename files
async function renameFiles(folderPath) {
  const files = await readFolder(folderPath);
  const fc2Map = {};
  const baseUrl = `https://adult.contents.fc2.com/article/`;

  for (const file of files) {
    // console.log(file)
    const found = file.match(/FC2\-PPV\-([0-9]{7})/);
    const oldFilePath = path.join(folderPath, file);;
    if (found) {
     
      // FC2 files
      let fc2Number = found[1];
      let processedFiles = fc2Map[fc2Number];
      const fileTaskInfo = {
        newFileName: '',
        oldFilePath,
        extName: path.extname(file)
      };

      if (!processedFiles) {
        processedFiles = {
          rename: true,
          files: [fileTaskInfo]
        };
        fc2Map[fc2Number] = processedFiles;
      } else {
        processedFiles.files.push(fileTaskInfo);
      }
      let url = baseUrl;
      url += `${fc2Number}/`;
      console.log(`Searching for title ${fc2Number}; URL: ${url}`);
      const title = await getTitleFromUrl(url);
      if (!title || title === titleNotFound) {
        console.log(`\tTitle not found.`, title);
        processedFiles.rename = false;
        continue;
      }

      console.log(`\tTitle: ${title}`);
      let sanitizedFileName = title.replace(invalidFilenamePattern, '');
      sanitizedFileName = sanitizedFileName.replace(/FC2\-PPV\-[0-9].*/g, '');
      sanitizedFileName =  `FC2-PPV-${fc2Number} ${sanitizedFileName}`;
      fileTaskInfo.newFileName = sanitizedFileName.trim();
    }
  }

  for (const [ fc2Number ,processedFiles ] of Object.entries(fc2Map)) {
    const {
      files, rename
    } = processedFiles;
    console.log(`\nProcessing ${fc2Number}`)
    if (!rename) {
      console.log(`${fc2Number} not found, skip...`);
      continue;
    }

    let index = 0;
    for (const file of files) {
      const { oldFilePath, newFileName, extName } = file;
      let newFilePath;
      if (files.length > 1) {
        index++;
        newFilePath = path.join(folderPath, `${newFileName}_${index}${extName}`);
      } else {
        newFilePath = path.join(folderPath, `${newFileName}${extName}`);
      }
      console.log(`${oldFilePath} \n=> ${newFilePath} \n`);

      if (fs.existsSync(newFilePath)) {
        // path.baseUrl(newFilePath);
        // newFilePath = path.join(folderPath, `${newFileName}_${index}${extName}`);
        console.log("File exists, skip...");
        continue;
      }
      fs.renameSync(oldFilePath, newFilePath);
    }  
  }
}

// Replace 'folderPath' with the path to your folder
// const folderPath = 'C:\\Users\\ljson\\Downloads';
const folderPath = 'E:\\Porns\\Porns-2024-02-10';
renameFiles(folderPath);
