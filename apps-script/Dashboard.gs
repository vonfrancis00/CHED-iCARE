
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

function getInstitutions() {
  return getOrBuildCache_(cacheKey_("INSTITUTIONS"), () => buildInstitutions_());
}

function buildInstitutions_() {
  const dataset = getRawDataset_();
  return {
    success: true,
    source: "google-sheet",
    updatedAt: new Date().toISOString(),
    cachedAt: dataset.cachedAt,
    headers: dataset.headers,
    data: dataset.rows.slice().reverse().map(addDisplayFields_)
  };
}

function getSurveyResponses() {
  return getInstitutions();
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
