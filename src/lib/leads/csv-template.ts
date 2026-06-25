export const CSV_TEMPLATE_FILENAME = "bmr-lead-import-template.csv";

export const CSV_TEMPLATE_CONTENT = `First Name,Last Name,Company Name,Billing Address,Billing City,Billing State,Billing Zip Code,Service Address,Service City,Service State,Service Zip Code,Cell Phone,Secondary Number,Email,Stage,Notes,Source,Existing Roof Type,Roof Type Requested,Remodel or New Construction,Homeowner or Contractor
John,Smith,,123 Billing Ln,Franklin,TN,37064,456 Oak Ave,Nashville,TN,37201,555-123-4567,,john@email.com,Qualified,"Wants standing seam",Referral,Shingle,Standing Seam,Remodel,Homeowner
,,ABC Roofing LLC,789 Corp Blvd,Murfreesboro,TN,37129,101 Job Site Rd,Lebanon,TN,37087,555-987-6543,555-987-6544,bids@abcroof.com,Lead Captured,"Multi-property contractor",Yard Sign,Metal,Standing Seam,New Construction,Contractor
`;

export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE_CONTENT], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = CSV_TEMPLATE_FILENAME;
  anchor.click();
  URL.revokeObjectURL(url);
}