
const H = {
  facilityFaculty: "Do you currently have a childcare facility or center on your campus that is used by faculty and non-teaching personnel?",
  facilityStudents: "Do you currently have a childcare facility or center on your campus that students use?",
  facilityCommunity: "Do you currently have a childcare facility or center on your campus that community members use?",
  facilityUse: "Which of the following best describes use of the childcare facilities or center in your campus?",
  nearbyFacility: "Are there childcare facilities in the vicinity of the campus that are NOT administered or monitored by the university?",

  programFaculty: "Do you currently have a documented childcare program for faculty and non-teaching personnel?",
  programStudents: "Do you currently have a documented childcare program for students?",
  programCommunity: "Do you currently have a documented childcare program for community members?",

  enrolledTotal: "Total number of enrolled solo parents",
  enrolledFemale: "Number of enrolled female solo parents",
  enrolledMale: "Number of enrolled male solo parents",

  communityTotal: "Total number of solo parents in the community",
  communityFemale: "Number of female solo parents in the community",
  communityMale: "Number of male solo parents in the community",

  institution: "Name of Institution",
  campus: "Name of Institution Campus",
  address: "Address of Campus",
  region: "Region"
};

function getDashboardData() {
  return getOrBuildCache_(cacheKey_("DASHBOARD"), () => buildDashboardData_());
}

function buildDashboardData_() {
  const dataset = getRawDataset_();
  const rows = dataset.rows;

  const facilityFaculty = countQuestion_(rows, H.facilityFaculty);
  const facilityStudents = countQuestion_(rows, H.facilityStudents);
  const facilityCommunity = countQuestion_(rows, H.facilityCommunity);

  const programFaculty = countQuestion_(rows, H.programFaculty);
  const programStudents = countQuestion_(rows, H.programStudents);
  const programCommunity = countQuestion_(rows, H.programCommunity);

  const soloParents = [
    {
      name: "Enrolled",
      female: sumNumeric_(rows, H.enrolledFemale),
      male: sumNumeric_(rows, H.enrolledMale),
      total: sumNumeric_(rows, H.enrolledTotal)
    },
    {
      name: "Community",
      female: sumNumeric_(rows, H.communityFemale),
      male: sumNumeric_(rows, H.communityMale),
      total: sumNumeric_(rows, H.communityTotal)
    }
  ];

  const occOffices = getOCCOfficeGroups_();

  const result = {
    success: true,
    source: "google-sheet",
    updatedAt: new Date().toISOString(),
    cachedAt: dataset.cachedAt,

    overview: {
      totalResponses: rows.length,
      facilityFacultyYes: facilityFaculty.yes,
      facilityStudentsYes: facilityStudents.yes,
      facilityCommunityYes: facilityCommunity.yes,
      programFacultyYes: programFaculty.yes,
      programStudentsYes: programStudents.yes,
      programCommunityYes: programCommunity.yes,
      enrolledSoloParents: soloParents[0].total,
      communitySoloParents: soloParents[1].total
    },

    facilityQuestions: [
      { name: "Faculty / Non-teaching", ...facilityFaculty },
      { name: "Students", ...facilityStudents },
      { name: "Community", ...facilityCommunity }
    ],

    programQuestions: [
      { name: "Faculty / Non-teaching", ...programFaculty },
      { name: "Students", ...programStudents },
      { name: "Community", ...programCommunity }
    ],

    facilityUse: countExactValue_(rows, H.facilityUse),
    nearbyFacility: countExactValue_(rows, H.nearbyFacility),
    soloParentAvailability: [],

    soloParents,

    regions: buildLocationDistribution_(rows),

    occDistribution: occOffices.map(({ name, value, responded, pending }) => ({ name, value, responded, pending })),
    occOffices,

    responses: rows.slice().reverse().slice(0, 10).map(addDisplayFields_),

    headers: dataset.headers
  };

  return result;
}

function addDisplayFields_(row) {
  return {
    ...row,
    facilityFaculty: headerValue_(row, H.facilityFaculty),
    facilityStudents: headerValue_(row, H.facilityStudents),
    facilityCommunity: headerValue_(row, H.facilityCommunity),
    programFaculty: headerValue_(row, H.programFaculty),
    programStudents: headerValue_(row, H.programStudents),
    programCommunity: headerValue_(row, H.programCommunity)
  };
}

function getInstitutions(params) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const query = String(params.query || "").trim().toLowerCase();
  const queryKey = query ? Utilities.base64EncodeWebSafe(query).slice(0, 80) : "ALL";
  return getOrBuildCache_(cacheKey_("INSTITUTIONS_PAGE_" + page + "_" + pageSize + "_" + queryKey), () => buildInstitutionsPage_(page, pageSize, query));
}

function buildInstitutionsPage_(page, pageSize, query) {
  const sheet = getResponseSheet_();
  const lastRow = Math.min(sheet.getLastRow(), (CONFIG.MAX_RESPONSE_ROWS || 5000) + 1);
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return { success: true, headers: [], data: [], total: 0, page: page, pageSize: pageSize, institutionCount: 0, campusCount: 0 };

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(h => String(h == null ? "" : h).trim());
  const institutionColumn = Math.max(0, headers.indexOf(H.institution));
  const institutionValues = sheet.getRange(2, institutionColumn + 1, lastRow - 1, 1).getValues();
  const institutionCount = new Set(institutionValues.map(row => String(row[0] || "").trim()).filter(Boolean)).size;
  const campusColumn = Math.max(0, headers.indexOf(H.campus));
  const campusValues = sheet.getRange(2, campusColumn + 1, lastRow - 1, 1).getValues();
  const campusCount = new Set(campusValues.map(row => String(row[0] || "").trim()).filter(Boolean)).size;

  if (query) {
    const dataset = getRawDataset_();
    const matches = dataset.rows.filter(row => Object.values(row).some(value => String(value == null ? "" : value).toLowerCase().includes(query))).reverse();
    const start = (page - 1) * pageSize;
    return { success: true, source: "google-sheet", updatedAt: new Date().toISOString(), cachedAt: dataset.cachedAt, headers: dataset.headers, data: matches.slice(start, start + pageSize).map(addDisplayFields_), total: matches.length, page: page, pageSize: pageSize, institutionCount: institutionCount, campusCount: campusCount };
  }

  const total = lastRow - 1;
  const endRow = lastRow - (page - 1) * pageSize;
  const startRow = Math.max(2, endRow - pageSize + 1);
  const count = Math.max(0, endRow - startRow + 1);
  const values = count ? sheet.getRange(startRow, 1, count, lastColumn).getValues() : [];
  const data = values.reverse().map((row, index) => {
    const item = { rowNumber: endRow - index };
    headers.forEach((header, column) => { item[header] = normalizeCellForJson_(row[column]); });
    return addDisplayFields_(item);
  });
  return {
    success: true,
    source: "google-sheet",
    updatedAt: new Date().toISOString(),
    headers: headers,
    data: data,
    total: total,
    page: page,
    pageSize: pageSize,
    institutionCount: institutionCount,
    campusCount: campusCount
  };
}

function getSurveyResponses(params) {
  return getInstitutions(params || {});
}

function buildInstitutions_() {
  const dataset = getRawDataset_();
  return { success: true, source: "google-sheet", updatedAt: new Date().toISOString(), cachedAt: dataset.cachedAt, headers: dataset.headers, data: dataset.rows.slice().reverse().map(addDisplayFields_) };
}

function buildLocationDistribution_(rows) {
  const counts = {};
  rows.forEach(row => {
    const group = String(headerValue_(row, H.region) ?? "").trim() || "Not specified";
    counts[group] = (counts[group] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function getOCCOfficeGroups_() {
  return getOrBuildCache_(cacheKey_("OCC"), () => buildOCCOfficeGroups_());
}

function buildOCCOfficeGroups_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.OCC);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) return [];

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const groups = {};

  // Per OCC layout: Region, SUC, Survey blocks at A:C, E:G, I:K, M:O, Q:S
  const groupsLayout = [];
  for (let officeCol = 1; officeCol < lastColumn; officeCol += 4) {
    groupsLayout.push({
      regionCol: officeCol - 1,
      officeCol,
      nameCol: officeCol,
      flagCol: officeCol + 1
    });
  }

  for (let r = 2; r < values.length; r++) {
    groupsLayout.forEach(({ regionCol, officeCol, nameCol, flagCol }) => {
      const name = String(values[r][nameCol] || "").trim();
      const flag = values[r][flagCol];
      const office = String(values[0][officeCol] || "").trim();
      if (!name || !office) return;
      if (!groups[office]) groups[office] = [];
      groups[office].push({
        name,
        region: String(values[r][regionCol] || "").trim(),
        responded: flag === true || String(flag).toLowerCase() === "true"
      });
    });
  }

  return Object.entries(groups)
    .map(([name, institutions]) => {
      const responded = institutions.filter(institution => institution.responded).length;

      return {
        name,
        value: institutions.length,
        responded,
        pending: institutions.length - responded,
        institutions
      };
    });
}

function clearDashboardCache() {
  removeCaches_([
    cacheKey_("DATASET"),
    cacheKey_("DASHBOARD"),
    cacheKey_("INSTITUTIONS"),
    cacheKey_("OCC")
  ]);
}
