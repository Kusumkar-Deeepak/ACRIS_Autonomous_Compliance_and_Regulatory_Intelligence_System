export class AmendmentRepository {
  constructor({ ImpactMapping }) {
    this.ImpactMapping = ImpactMapping;
  }

  async findById(amendmentId) {
    return this.ImpactMapping.findById(amendmentId)
      .populate("doc_id")
      .populate("regulation_id");
  }

  async updateReviewStatus(amendmentId, reviewStatus, reviewedBy) {
    return this.ImpactMapping.findByIdAndUpdate(
      amendmentId,
      { reviewStatus, reviewed_by: reviewedBy },
      { new: true },
    )
      .populate("doc_id")
      .populate("regulation_id");
  }
}
