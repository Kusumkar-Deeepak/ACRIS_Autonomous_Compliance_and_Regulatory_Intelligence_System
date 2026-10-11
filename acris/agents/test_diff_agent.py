import unittest
from unittest.mock import patch

# Import the processing functions from diff_agent
import diff_agent

class TestDiffAgent(unittest.TestCase):
    @patch("diff_agent.summarize_for_business")
    def test_partial_failure_isolation(self, mock_summarize):
        # We simulate a scenario where one clause succeeds and another fails.
        # process_added will call summarize_for_business.
        
        # We will make summarize_for_business raise an exception for Clause 2.
        def side_effect(change_type, clause, old_text, new_text):
            if clause == "Clause 2":
                raise RuntimeError("Simulated LLM failure")
            return f"Mocked success for {clause}"
            
        mock_summarize.side_effect = side_effect
        
        clause1 = {"clause": "Clause 1", "text": "This is clause 1."}
        clause2 = {"clause": "Clause 2", "text": "This is clause 2, which will fail."}
        clause3 = {"clause": "Clause 3", "text": "This is clause 3."}
        
        from concurrent.futures import ThreadPoolExecutor
        
        futures = []
        changes = []
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures.append(executor.submit(diff_agent.process_added, clause1))
            futures.append(executor.submit(diff_agent.process_added, clause2))
            futures.append(executor.submit(diff_agent.process_added, clause3))
            
            for i, future in enumerate(futures):
                try:
                    result = future.result()
                    changes.append(result)
                except Exception:
                    # In main() we catch and pass.
                    pass

        self.assertEqual(len(changes), 2)
        self.assertEqual(changes[0]["clause"], "Clause 1")
        self.assertEqual(changes[1]["clause"], "Clause 3")

if __name__ == "__main__":
    unittest.main()
