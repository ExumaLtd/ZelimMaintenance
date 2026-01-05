import { createRouteHandler, createUploadthing } from "uploadthing/next-legacy";

const f = createUploadthing();

// This is where you define your "Endpoints"
// We'll create one for maintenance photos and one for signatures
export const ourFileRouter = {
  maintenanceImage: f({ image: { maxFileSize: "4MB", maxFileCount: 4 } })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for maintenance photo:", file.url);
      return { url: file.url };
    }),

  signatureImage: f({ image: { maxFileSize: "1MB", maxFileCount: 1 } })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for signature:", file.url);
      return { url: file.url };
    }),
};

// Export the API route handler
export default createRouteHandler({
  router: ourFileRouter,
});