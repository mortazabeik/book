import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

function AppNotFoundComponent() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 text-center text-fg">
      <div>
        <p className="text-sm font-medium text-subtle">404</p>
        <h1 className="mt-2 text-2xl font-semibold">صفحه پیدا نشد</h1>
        <p className="mt-2 text-sm text-subtle">آدرس واردشده وجود ندارد.</p>
        <a className="mt-6 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg" href="/">
          بازگشت به صفحه اصلی
        </a>
      </div>
    </main>
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: AppNotFoundComponent,
  });
}
