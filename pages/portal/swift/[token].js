export { default } from "../../swift/[id]/index";

export async function getServerSideProps(context) {
  const { getServerSideProps: dashboardGSSP } = await import("../../swift/[id]/index");
  
  return dashboardGSSP({
    ...context,
    params: { ...context.params, id: context.params.token },
  });
}