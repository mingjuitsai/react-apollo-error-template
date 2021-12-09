/*** SCHEMA ***/
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
} from "graphql";

const PreferenceType = new GraphQLObjectType({
  name: "Preference",
  fields: {
    like: { type: GraphQLString },
    dislike: { type: GraphQLString },
  },
});

const PersonType = new GraphQLObjectType({
  name: "Person",
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    age: { type: GraphQLInt },
    preference: { type: PreferenceType },
  },
});

const peopleData = [
  {
    id: 1,
    name: "John Smith",
    age: 25,
    preference: {
      like: "cat",
      dislike: "dog",
    },
  },
  {
    id: 2,
    name: "Sarah Smith",
    age: 30,
    preference: {
      like: "lion",
      dislike: "apple",
    },
  },
  {
    id: 3,
    name: "Budd Deey",
    age: 41,
    preference: {
      like: "computer",
      dislike: "swimming",
    },
  },
  {
    id: 4,
    name: "John One",
    age: 55,
    preference: {
      like: "swimming",
      dislike: "computer",
    },
  },
  {
    id: 5,
    name: "John Two",
    age: 15,
    preference: {
      like: "dog",
      dislike: "bird",
    },
  },
  {
    id: 6,
    name: "John Three",
    age: 14,
    preference: {
      like: "snake",
      dislike: "dog",
    },
  },
  {
    id: 7,
    name: "John Four",
    age: 44,
    preference: {
      like: "dog",
      dislike: "swimming",
    },
  },
];

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    people: {
      type: new GraphQLList(PersonType),
      args: {
        name: { type: GraphQLString },
        like: { type: GraphQLString },
        limit: { type: GraphQLInt },
      },
      resolve: (_, { name, like, limit }) => {
        let data = peopleData;

        if (name) {
          data = data.filter((p) => p.name.includes(name));
        }
        if (like) {
          data = data.filter((p) => p.preference.like === like);
        }

        return data.slice(0, limit);
      },
    },
  },
});

const schema = new GraphQLSchema({ query: QueryType });

/*** LINK ***/
import { graphql, print } from "graphql";
import { ApolloLink, Observable } from "@apollo/client";
function delay(wait) {
  return new Promise((resolve) => setTimeout(resolve, wait));
}

const link = new ApolloLink((operation) => {
  return new Observable(async (observer) => {
    const { query, operationName, variables } = operation;
    await delay(300);
    try {
      const result = await graphql({
        schema,
        source: print(query),
        variableValues: variables,
        operationName,
      });
      observer.next(result);
      observer.complete();
    } catch (err) {
      observer.error(err);
    }
  });
});

/*** APP ***/
import React from "react";
import { render } from "react-dom";
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useQuery,
} from "@apollo/client";
import "./index.css";

const GET_PEOPLE_NAME_ONLY = gql`
  query GetPeople($name: String, $like: String) {
    people(name: $name, like: $like) {
      id
      name
    }
  }
`;

const GET_PEOPLE = gql`
  query GetPeople($name: String, $like: String, $limit: Int) {
    people(name: $name, like: $like, limit: $limit) {
      id
      name
      age
      preference {
        like
        dislike
      }
    }
  }
`;

function PeopleNameOnly() {
  const { data } = useQuery(GET_PEOPLE_NAME_ONLY, {
    fetchPolicy: "network-only",
    returnPartialData: false,
    notifyOnNetworkStatusChange: true,
    variables: {
      name: "John",
    },
  });

  return (
    <ul>
      {data?.people.map((person) => (
        <li key={person.id}>{person.name}</li>
      ))}
    </ul>
  );
}

function People() {
  const [name, setName] = React.useState("Sarah");

  const { data } = useQuery(GET_PEOPLE, {
    fetchPolicy: "network-only",
    returnPartialData: false,
    notifyOnNetworkStatusChange: true,
    variables: {
      name,
    },
  });

  function renderPreference({ like, dislike }) {
    return `like ${like} and dislike ${dislike}`;
  }

  return (
    <>
      <aside>
        <button
          type="button"
          disabled={name === "Sarah"}
          onClick={() => {
            setName("Sarah");
          }}
        >
          name includes Sarah
        </button>
        <button
          type="button"
          disabled={name === "John"}
          onClick={() => {
            setName("John");
          }}
        >
          name includes John
        </button>
      </aside>
      <ul>
        {data?.people.map((person) => (
          <li key={person.id}>
            {person.name} ({person.age}), {renderPreference(person.preference)}
          </li>
        ))}
      </ul>
    </>
  );
}

function PeopleList() {
  const [page, setPage] = React.useState(0);
  return (
    <>
      <button
        type="button"
        disabled={page === 0}
        onClick={() => {
          setPage(0);
        }}
      >
        Page 1
      </button>
      <button
        type="button"
        disabled={page === 1}
        onClick={() => {
          setPage(1);
        }}
      >
        Page 2
      </button>
      {page === 0 && <PeopleNameOnly />}
      {page === 1 && <People />}
    </>
  );
}

function App() {
  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>
      <PeopleList />
    </main>
  );
}

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});

render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById("root")
);
