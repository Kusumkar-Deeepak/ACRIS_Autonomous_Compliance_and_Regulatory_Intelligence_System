import unittest

from diff_agent import process_static
from shared import best_match_with_score, split_clauses


class TestStage3DiffContract(unittest.TestCase):
    def test_identical_clauses_are_preserved_as_unchanged(self):
        old = split_clauses("Clause 1\nRequirement A\n\nClause 2\nRequirement B")
        new = split_clauses("Clause 1\nRequirement A\n\nClause 2\nRequirement B")

        match, ratio = best_match_with_score(new[0]["text"], old, 0.45)
        row = process_static(
            "unchanged",
            new[0],
            match,
            {
                "regulation_key": "rbi:circular",
                "from_version": 1,
                "to_version": 2,
                "from_id": "old-id",
                "to_id": "new-id",
                "threshold": 0.45,
            },
            ratio,
        )

        self.assertEqual(row["change_type"], "unchanged")
        self.assertEqual(row["fromVersion"], 1)
        self.assertEqual(row["toVersion"], 2)
        self.assertGreaterEqual(row["matchRatio"], 0.45)
        self.assertTrue(row["clauseId"])

    def test_renumbered_clause_is_not_added_and_removed(self):
        old = split_clauses("Clause 1\nRequirement A")
        new = split_clauses("Clause 2\nRequirement A")
        match, ratio = best_match_with_score(new[0]["text"], old, 0.45)

        row = process_static(
            "renumbered",
            new[0],
            match,
            {
                "regulation_key": "rbi:circular",
                "from_version": 1,
                "to_version": 2,
                "from_id": "old-id",
                "to_id": "new-id",
                "threshold": 0.45,
            },
            ratio,
        )

        self.assertEqual(row["change_type"], "renumbered")
        self.assertEqual(row["oldClauseNumber"], "Clause 1")
        self.assertEqual(row["newClauseNumber"], "Clause 2")

    def test_match_threshold_is_respected(self):
        match, ratio = best_match_with_score("completely different", [{"text": "original"}], 0.99)
        self.assertIsNone(match)
        self.assertLess(ratio, 0.99)


if __name__ == "__main__":
    unittest.main()
