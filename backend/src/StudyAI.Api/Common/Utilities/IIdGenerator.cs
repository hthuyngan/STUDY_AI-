namespace StudyAI.Common.Utilities;

public interface IIdGenerator
{
    string NewId();
    string NewId(string prefix);
}
