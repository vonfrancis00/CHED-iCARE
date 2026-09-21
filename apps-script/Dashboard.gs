
const H = {
  institutionType: "SUC/LUC",
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
  const institutionTypes = countInstitutionTypes_(rows);

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
      lucResponses: institutionTypes.luc,
      sucResponses: institutionTypes.suc,
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

function countInstitutionTypes_(rows) {
  return rows.reduce((counts, row) => {
    const type = String(headerValue_(row, H.institutionType)).trim().toUpperCase();
    if (type === "LUC") counts.luc++;
    if (type === "SUC") counts.suc++;
    return counts;
  }, { luc: 0, suc: 0 });
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
  const institutionType = String(params.institutionType || "").trim().toUpperCase();
  const region = String(params.region || "").trim().toLowerCase();
  const filterKey = Utilities.base64EncodeWebSafe([query, institutionType, region].join("|")).slice(0, 120) || "ALL";
  // CacheService cannot delete entries by prefix. Include this revision in every
  // page key so a refresh immediately makes every paginated/search cache stale.
  const revision = getResponseCacheRevision_();
  return getOrBuildCache_(cacheKey_("INSTITUTIONS_PAGE_" + revision + "_" + page + "_" + pageSize + "_" + filterKey), () => buildInstitutionsPage_(page, pageSize, query, institutionType, region));
}

function buildInstitutionsPage_(page, pageSize, query, institutionType, region) {
  // Share the dashboard's cached dataset for browsing AND searching. Once warm,
  // paging needs no spreadsheet reads and all totals refer to the same snapshot.
  const dataset = getRawDataset_();
  const rows = dataset.rows;
  const institutionCount = new Set(rows.map(row => String(headerValue_(row, H.institution) || "").trim()).filter(Boolean)).size;
  const campusCount = new Set(rows.map(row => String(headerValue_(row, H.campus) || "").trim()).filter(Boolean)).size;
  const institutionTypes = countInstitutionTypes_(rows);
  const matches = rows.filter(row => {
    const matchesQuery = !query || Object.values(row).some(value => String(value == null ? "" : value).toLowerCase().includes(query));
    const matchesType = !institutionType || String(headerValue_(row, H.institutionType) || "").trim().toUpperCase() === institutionType;
    const matchesRegion = !region || String(headerValue_(row, H.region) || "").trim().toLowerCase() === region;
    return matchesQuery && matchesType && matchesRegion;
  }).reverse();
  const start = (page - 1) * pageSize;
  return {
    success: true, source: "google-sheet", updatedAt: new Date().toISOString(),
    cachedAt: dataset.cachedAt, headers: dataset.headers,
    data: matches.slice(start, start + pageSize).map(addDisplayFields_),
    total: matches.length, page: page, pageSize: pageSize,
    institutionCount: institutionCount, campusCount: campusCount,
    lucCount: institutionTypes.luc, sucCount: institutionTypes.suc,
    regions: Array.from(new Set(rows.map(row => String(headerValue_(row, H.region) || "").trim()).filter(Boolean))).sort(),
    filters: { institutionType: institutionType, region: region, query: query }
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
      const isComplete = institutions.length > 0 && responded === institutions.length;
      const completionKey = "OCC_COMPLETED_AT_" + encodeURIComponent(name);
      const properties = PropertiesService.getScriptProperties();
      let completedAt = properties.getProperty(completionKey);

      // The source register records completion as a checkbox, so retain the
      // first time an office is observed fully complete between dashboard reads.
      if (isComplete && !completedAt) {
        completedAt = new Date().toISOString();
        properties.setProperty(completionKey, completedAt);
      } else if (!isComplete && completedAt) {
        properties.deleteProperty(completionKey);
        completedAt = null;
      }

      return {
        name,
        value: institutions.length,
        responded,
        pending: institutions.length - responded,
        completedAt,
        institutions
      };
    });
}

function clearDashboardCache() {
  // Bump the page-cache namespace because CacheService has no wildcard delete.
  PropertiesService.getScriptProperties().setProperty("CHILDCARE_RESPONSE_CACHE_REVISION", String(Date.now()));
  removeCaches_([
    cacheKey_("DATASET"),
    cacheKey_("DASHBOARD"),
    cacheKey_("OCC")
  ]);
}

function getResponseCacheRevision_() {
  return PropertiesService.getScriptProperties().getProperty("CHILDCARE_RESPONSE_CACHE_REVISION") || "0";
}
