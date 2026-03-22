git log --oneline -3 main > test_output.txt
git log --oneline -3 develop >> test_output.txt
git diff main develop --name-only >> test_output.txt
