namespace StudyAI.Application.Common.Interfaces;

public interface IIdGenerator
{
    string NewId();
    string NewId(string prefix);
}
