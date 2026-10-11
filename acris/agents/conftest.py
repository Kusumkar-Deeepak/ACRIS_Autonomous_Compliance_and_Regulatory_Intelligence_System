import sys
from pathlib import Path

import pytest

# Put agents directory on sys.path
agents_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(agents_dir))

@pytest.fixture
def mock_db(mocker):
    return mocker.patch("shared.get_db")

@pytest.fixture
def mock_llm(mocker):
    return mocker.patch("llm.get_llm")
