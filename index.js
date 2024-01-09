import fs from "fs";
import { PdfReader } from "pdfreader";

// Asynchronously read directory contents.
async function readDirectory(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });
}

// Process PDF file and return data in a structured format.
async function processPdf(path) {
  let pages = [];
  let currentPage = {};

  return new Promise((resolve, reject) => {
    new PdfReader().parseFileItems(path, (err, item) => {
      if (err) {
        reject(err);
      } else if (!item) {
        resolve(pages);
      } else if (item.page) {
        currentPage = {};
        pages.push(currentPage);
      } else if (item.text) {
        (currentPage[item.y] = currentPage[item.y] || []).push(item.text);
      }
    });
  });
}

// Format PDF data.
function formatPdfData(data, year, campus, course) {
  let formattedData = [];

  data.forEach((page) => {
    Object.keys(page).forEach((y) => {
      const rowData = page[y].map((item) => item.trim());

      // Fix: Status is always `null` because the status is always in the first row of the page. So, we need to traverse the array to find thestatus.Status either`QUALIFIED`or`WAITLISTED`
      const status = ["QUALIFIED", "WAITLISTED"].find(
        (s) => s === rowData[0].toUpperCase()
      );

      if (!isNaN(parseFloat(rowData[0])) && rowData.length >= 8) {
        formattedData.push({
          rank: rowData[0],
          lastName: rowData[1] || null,
          firstName: rowData[2],
          middleName: rowData.length === 9 ? rowData[3] : null,
          city: rowData.length === 9 ? rowData[4] : rowData[3],
          province: rowData.length === 9 ? rowData[5] : rowData[4],
          school: rowData.length === 9 ? rowData[6] : rowData[5],
          compositeRating: rowData.length === 9 ? rowData[7] : rowData[6],
          percentileRank: rowData.length === 9 ? rowData[8] : rowData[7],
          status: status,
          course: course,
          campus: campus,
          year: year,
        });
      }
    });
  });

  return formattedData;
}

// Main function to parse PDF files and output JSON.
async function parsePdfFiles(inputPath, outputPath = "./output.json") {
  let allData = [];

  try {
    const years = await readDirectory(inputPath);

    for (const year of years) {
      const campuses = await readDirectory(`${inputPath}/${year}`);

      for (const campus of campuses) {
        const courses = await readDirectory(`${inputPath}/${year}/${campus}`);

        for (const course of courses) {
          const pdfPath = `${inputPath}/${year}/${campus}/${course}`;
          const pdfData = await processPdf(pdfPath);
          const formattedData = formatPdfData(
            pdfData,
            pdfPath,
            year,
            campus,
            course
          );
          allData.push(...formattedData);
        }
      }
    }

    fs.writeFileSync(outputPath, JSON.stringify(allData));
  } catch (err) {
    console.error("Error processing PDF files:", err);
  }
}

// Start processing.
parsePdfFiles("./pdfs");
