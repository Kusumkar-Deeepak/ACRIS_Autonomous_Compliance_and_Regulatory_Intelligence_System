export class AmendmentService {
  constructor(repository) {
    this.repository = repository;
  }

  async review(amendmentId, reviewStatus, reviewedBy = "system") {
    if (!["approved", "rejected"].includes(reviewStatus)) {
      const error = new Error("Invalid amendment review status");
      error.statusCode = 400;
      throw error;
    }

    const amendment = await this.repository.findById(amendmentId);
    if (!amendment) {
      return null;
    }

    if (amendment.reviewStatus !== "pending") {
      const error = new Error("Amendment has already been reviewed");
      error.statusCode = 409;
      throw error;
    }

    return this.repository.updateReviewStatus(
      amendmentId,
      reviewStatus,
      reviewedBy,
    );
  }

  async approve(amendmentId, reviewedBy = "system") {
    return this.review(amendmentId, "approved", reviewedBy);
  }

  async reject(amendmentId, reviewedBy = "system") {
    return this.review(amendmentId, "rejected", reviewedBy);
  }
}
