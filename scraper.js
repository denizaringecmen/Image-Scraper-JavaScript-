/**
 * Copyright (c) Deniz Arın Geçmen [10/12/2024]
 * 
 * This script is intended for scraping images based on user-defined parameters.
 * You are free to modify and distribute this code as long as the copyright notice remains intact.
 * 
 * Author: Deniz Arın Geçmen
 * 
 */

const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size'); // Import the image-size module
const readline = require('readline'); // For user input

// Create an interface to get user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get user input asynchronously
function getUserInput(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Function to download and check image size and resolution
async function downloadImage(url, folderPath, index) {
    try {
        // Download the image using axios
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer', // Use arraybuffer to handle image data
        });

        // Check if the image size is greater than or equal to 1MB
        const MIN_FILE_SIZE = 1 * 1024 * 1024; // Minimum file size (1MB)
        if (response.data.length >= MIN_FILE_SIZE) {
            // Use image-size to check the image resolution
            const dimensions = sizeOf(response.data);

            if (dimensions.width >= 1920 && dimensions.height >= 1080) {
                // Only save if the resolution is >= 1920x1080 and the file size is >= 1MB
                const imagePath = path.join(folderPath, `image${index + 1}.jpg`);
                fs.writeFileSync(imagePath, response.data);
                console.log(`Image ${index + 1} saved successfully with resolution ${dimensions.width}x${dimensions.height}`);
            } else {
                console.log(`Image ${index + 1} skipped due to low resolution: ${dimensions.width}x${dimensions.height}`);
            }
        } else {
            console.log(`Image ${index + 1} skipped due to small file size: ${response.data.length} bytes`);
        }

    } catch (error) {
        console.error(`Error downloading or checking image ${index + 1}:`, error);
    }
}

(async function yandexImageSearchBot() {
    try {
        // Step 1: Get user input for search query and folder name
        const searchQuery = await getUserInput('Enter the search query (e.g., "Scuba Diving"): ');
        const folderName = await getUserInput('Enter the folder name to save images: ');

        rl.close(); // Close the input interface after receiving inputs

        // Step 2: Initialize WebDriver
        let driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().addArguments('--disable-headless')) // Disable headless mode for debugging
            .build();

        // Step 3: Navigate to Yandex Images
        await driver.get('https://yandex.com/images/');

        // Step 4: Wait for the search box to load and perform the search
        const searchBox = await driver.wait(until.elementLocated(By.css('input.input__control')), 10000);
        await searchBox.sendKeys(searchQuery, Key.RETURN);

        // Step 5: Wait for the images to load
        await driver.wait(until.elementLocated(By.css('.ContentImage-Image')), 10000);

        // Step 6: Scroll the page to load more images (lazy loading)
        for (let i = 0; i < 25; i++) {
            await driver.executeScript('window.scrollBy(0, 400)');
            await driver.sleep(1000); // Pause to allow images to load
        }

        // Step 7: Extract image URLs
        const linkElements = await driver.findElements(By.css('a.Link.ContentImage-Cover'));
        let imageUrls = [];

        for (let linkElement of linkElements) {
            let href = await linkElement.getAttribute('href');
            const urlParams = new URLSearchParams(href.split('?')[1]);
            const fullImageUrl = urlParams.get('img_url');

            // Add protocol if missing
            if (fullImageUrl && fullImageUrl.startsWith('//')) {
                imageUrls.push('https:' + fullImageUrl); // Ensure 'https:' protocol is added
            } else if (fullImageUrl) {
                imageUrls.push(fullImageUrl); // If it's already full, just push the URL
            }
        }

        // Step 8: Create the folder to save images if it doesn't exist
        const folderPath = path.join(__dirname, folderName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }

        // Step 9: Download and check image resolutions and file sizes
        for (let i = 0; i < imageUrls.length; i++) {
            await downloadImage(imageUrls[i], folderPath, i);
        }

    } catch (error) {
        console.error('Error:', error);
    }
})();


