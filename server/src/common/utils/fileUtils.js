const XLSX = require("xlsx");
const path = require("path");

const getJsonFromXlsxFile = (filePath) => {
  try {
    const { sheet_name_list, workbook } = readXLSXFile(filePath);
    const worksheet = workbook.Sheets[sheet_name_list[0]];
    const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    return json;
  } catch (err) {
    return null;
  }
};
module.exports.getJsonFromXlsxFile = getJsonFromXlsxFile;

const readXLSXFile = (localPath) => {
  const workbook = XLSX.readFile(localPath, { codepage: 65001 });
  return { sheet_name_list: workbook.SheetNames, workbook };
};
module.exports.readXLSXFile = readXLSXFile;

const createXLSXFile = (data, localPath) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "data");

  XLSX.writeFileAsync(path.join(localPath), workbook, (e) => {
    if (e) {
      console.log(e);
      throw new Error("La génération du fichier excel à échoué : ", e);
    }
  });
};
module.exports.createXLSXFile = createXLSXFile;
