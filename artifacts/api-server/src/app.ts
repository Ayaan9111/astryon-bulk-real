import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors());

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/api/webhook/paddle") {
    express.raw({ type: "*/*" })(req, res, (err) => {
      if (err) return next(err);
      (req as any).rawBody = req.body;
      try {
        req.body = JSON.parse((req as any).rawBody.toString("utf8"));
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
