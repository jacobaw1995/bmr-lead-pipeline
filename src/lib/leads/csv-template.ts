export const CSV_TEMPLATE_FILENAME = "bmr-lead-import-template.csv";

export const CSV_TEMPLATE_CONTENT = `name,phone,email,street,city,state,zip,source,notes
John Smith,555-123-4567,john@email.com,123 Main St,Franklin,TN,37064,Referral,"Wants standing seam — called in March"
Jane Doe,555-987-6543,,456 Oak Ave,Nashville,TN,37201,Yard Sign,"Saw sign on Hwy 96"
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