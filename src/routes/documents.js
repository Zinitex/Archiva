const router = require("express").Router();
const {
  getAll,
  getById,
  create,
  update,
  remove,
  review,
  approve,
  reject,
  archive,
  resubmit,
  getHistory,
} = require("../controllers/documentController");
const { getComments, addComment } = require("../controllers/commentController");
const { getVersions } = require("../controllers/versionController");
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/roles");
const upload = require("../config/multer");

router.get("/", authenticate, getAll);
router.get("/:id", authenticate, getById);
router.post("/", authenticate, upload.single("file"), create);
router.put("/:id", authenticate, upload.single("file"), update);
router.delete("/:id", authenticate, remove);

router.post(
  "/:id/review",
  authenticate,
  authorize("reviewer", "admin"),
  review,
);
router.post(
  "/:id/approve",
  authenticate,
  authorize("approver", "admin"),
  approve,
);
router.post(
  "/:id/reject",
  authenticate,
  authorize("approver", "admin"),
  reject,
);
router.post("/:id/archive", authenticate, authorize("admin"), archive);
router.post("/:id/resubmit", authenticate, resubmit);

router.get("/:id/history", authenticate, getHistory);
router.get("/:id/versions", authenticate, getVersions);
router.get("/:id/comments", authenticate, getComments);
router.post("/:id/comments", authenticate, addComment);

module.exports = router;
