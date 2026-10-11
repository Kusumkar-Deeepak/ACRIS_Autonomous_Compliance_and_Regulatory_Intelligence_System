import sys
import pytest

def test_lazy_llm_import(monkeypatch):
    # Hide langchain_community from sys.modules
    monkeypatch.setitem(sys.modules, "langchain_community", None)
    monkeypatch.setitem(sys.modules, "langchain_community.llms", None)
    
    # Importing llm should succeed
    import llm
    
    # But calling get_llm should raise an exception
    with pytest.raises(ImportError):
        llm.get_llm()
