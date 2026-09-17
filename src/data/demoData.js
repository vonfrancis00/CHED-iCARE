
export const demoDashboard = {
  success: true,
  source: "demo",
  updatedAt: new Date().toISOString(),
  overview: {
    totalResponses: 114,
    lucResponses: 5,
    sucResponses: 8,
    facilityFacultyYes: 44,
    facilityStudentsYes: 42,
    facilityCommunityYes: 25,
    programFacultyYes: 51,
    programStudentsYes: 54,
    programCommunityYes: 33,
    enrolledSoloParents: 0,
    communitySoloParents: 0
  },
  facilityQuestions: [
    { name: "Faculty / Non-teaching", yes: 44, no: 60, planned: 10 },
    { name: "Students", yes: 42, no: 58, planned: 14 },
    { name: "Community", yes: 25, no: 79, planned: 10 }
  ],
  programQuestions: [
    { name: "Faculty / Non-teaching", yes: 51, no: 49, planned: 14 },
    { name: "Students", yes: 54, no: 43, planned: 17 },
    { name: "Community", yes: 33, no: 64, planned: 17 }
  ],
  facilityUse: [],
  nearbyFacility: [],
  soloParentAvailability: [],
  occDistribution: [],
  regions: [],
  responses: []
};

export const demoInstitutions = [];
