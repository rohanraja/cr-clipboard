const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

const uploadsDir = path.join(__dirname, 'uploads');
const outputFile = path.join(uploadsDir, 'all.csv');

// Function to find all CSV files in a directory
function findCsvFiles(directory) {
    return fs.readdirSync(directory)
        .filter(file => file.toLowerCase().endsWith('.csv'))
        .filter(file => file !== 'all.csv') // Skip the output file if it exists
        .map(file => path.join(directory, file));
}

// Function to read a CSV file and return its data as an array of objects
function readCsvFile(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve({ file: path.basename(filePath), data: results }))
            .on('error', (error) => reject(error));
    });
}

// Main function to merge all CSV files
async function mergeAllCsvFiles() {
    try {
        console.log('Starting CSV merge process...');
        const csvFiles = findCsvFiles(uploadsDir);
        
        if (csvFiles.length === 0) {
            console.log('No CSV files found in uploads directory.');
            return;
        }
        
        console.log(`Found ${csvFiles.length} CSV files.`);
        
        // Read all CSV files
        const filePromises = csvFiles.map(file => readCsvFile(file));
        const filesData = await Promise.all(filePromises);
        
        // Extract headers from first file to ensure consistent columns
        let allData = [];
        let headers = [];
        
        if (filesData.length > 0 && filesData[0].data.length > 0) {
            headers = Object.keys(filesData[0].data[0]);
        } else {
            console.log('No data found in CSV files.');
            return;
        }
        
        // Merge all data
        filesData.forEach(fileData => {
            console.log(`Processing ${fileData.file} with ${fileData.data.length} rows`);
            allData = allData.concat(fileData.data);
        });
        
        // Setup CSV writer
        const csvWriter = createObjectCsvWriter({
            path: outputFile,
            header: headers.map(header => ({ id: header, title: header }))
        });
        
        // Write merged data
        await csvWriter.writeRecords(allData);
        console.log(`Successfully merged ${allData.length} rows into ${outputFile}`);
    } catch (error) {
        console.error('Error merging CSV files:', error);
    }
}

// Execute the merge function
// mergeAllCsvFiles();

module.exports = {
    mergeAllCsvFiles,
    findCsvFiles,
    readCsvFile
};
